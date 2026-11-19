// App-Zustand: alles im Speicher, Schreibzugriffe gehen direkt in IndexedDB.
import * as db from './db.js';
import { CONFIG } from './config.js';
import { PLANT_BY_ID, REGIONS } from './plants.js';
import { plantsForMinutes, tokensFor, tokenBalance, tokensAfterDelete } from './growth.js';
import { buildExport, validateBackup as checkBackup, importableKV } from './backup.js';
import { finalize } from './sessionlogic.js';
import { pickVariant } from './sprites.js';

export const S = {
  tags: [],
  sessions: [],
  plants: [],
  kv: {},
};

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn();
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export async function init() {
  const [tags, sessions, plants, kv] = await Promise.all(db.STORES.map((s) => db.getAll(s)));
  S.tags = tags;
  S.sessions = sessions.sort((a, b) => a.startedAt - b.startedAt);
  S.plants = plants;
  S.kv = Object.fromEntries(kv.map((r) => [r.key, r.value]));
  if (!S.kv.installedAt) {
    await setKV('installedAt', Date.now());
    if (!S.tags.length) await saveTag({ name: 'Lernen', color: CONFIG.tagColors[0] });
  }
}

// --- Key/Value -------------------------------------------------------------
export async function setKV(key, value) {
  if (value === undefined) {
    delete S.kv[key];
    await db.del('kv', key);
  } else {
    S.kv[key] = value;
    await db.put('kv', { key, value });
  }
  emit();
}

// --- Tags ------------------------------------------------------------------
export function activeTags() {
  return S.tags.filter((t) => !t.deleted).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

export function tagById(id) {
  return S.tags.find((t) => t.id === id) || null;
}

export function tagName(id) {
  const t = tagById(id);
  if (!t) return 'Ohne Tag';
  return t.deleted ? `${t.name} (gelöscht)` : t.name;
}

export function tagColor(id) {
  return tagById(id)?.color || '#a8a2ac';
}

/** Name schon vergeben (ohne Groß/Klein, nur aktive Tags)? */
export function tagNameTaken(name, exceptId = null) {
  const n = (name || '').trim().toLocaleLowerCase('de-DE');
  return activeTags().some((t) => t.id !== exceptId && t.name.trim().toLocaleLowerCase('de-DE') === n);
}

export async function saveTag(tag) {
  const name = (tag.name || '').trim();
  if (!name && !tag.deleted) throw new Error('Bitte gib dem Tag einen Namen.');
  if (!tag.deleted && tagNameTaken(name, tag.id)) throw new Error(`Es gibt schon einen Tag „${name}“.`);
  const t = {
    id: tag.id || uid(),
    name: (tag.name || '').trim() || 'Ohne Namen',
    color: tag.color || CONFIG.tagColors[S.tags.length % CONFIG.tagColors.length],
    createdAt: tag.createdAt || Date.now(),
    order: tag.order ?? S.tags.length,
    deleted: !!tag.deleted,
  };
  const i = S.tags.findIndex((x) => x.id === t.id);
  if (i >= 0) S.tags[i] = t;
  else S.tags.push(t);
  await db.put('tags', t);
  emit();
  return t;
}

/** Weiches Löschen: Statistiken behalten Name und Farbe. */
export async function deleteTag(id) {
  const t = tagById(id);
  if (!t) return;
  await saveTag({ ...t, deleted: true });
}

// --- Tokens & Freischaltungen ---------------------------------------------
export function purchases() {
  return S.kv.purchases || [];
}

export function tokensEarned() {
  return S.sessions.reduce((a, s) => a + (s.tokens || 0), 0);
}

export function tokensSpent() {
  return purchases().reduce((a, p) => a + (p.price || 0), 0);
}

export function tokenAdjust() {
  return S.kv.tokenAdjust || 0;
}

/** Verfügbarer Kontostand – nie negativ. */
export function balance() {
  return tokenBalance(tokensEarned(), tokensSpent(), tokenAdjust());
}

/** Vorschau fürs Löschen einer Session (siehe growth.tokensAfterDelete). */
export function deletePreview(sessionId) {
  const s = S.sessions.find((x) => x.id === sessionId);
  return tokensAfterDelete(tokensEarned(), tokensSpent(), tokenAdjust(), s?.tokens || 0);
}

export function unlocked() {
  const regions = new Set(CONFIG.startUnlocked.regions);
  const species = new Set(CONFIG.startUnlocked.species);
  for (const p of purchases()) {
    if (p.type === 'region') {
      regions.add(p.id);
      for (const sp of CONFIG.includedWithRegion[p.id] || []) species.add(sp);
    } else if (p.type === 'plant') species.add(p.id);
  }
  return { regions, species };
}

export function isRegionUnlocked(id) {
  return unlocked().regions.has(id);
}

export function isPlantUnlocked(id) {
  const u = unlocked();
  const p = PLANT_BY_ID[id];
  return !!p && u.species.has(id) && u.regions.has(p.region);
}

export async function buy(type, id) {
  const price = type === 'region' ? CONFIG.regionPrices[id] : PLANT_BY_ID[id]?.price;
  if (price == null) throw new Error('Unbekannter Artikel');
  if (balance() < price) throw new Error('Nicht genug Tokens');
  await setKV('purchases', [...purchases(), { type, id, price, at: Date.now() }]);
}

export function unlockedRegions() {
  const u = unlocked();
  return REGIONS.filter((r) => u.regions.has(r.id));
}

// --- Laufende Session -----------------------------------------------------
export function active() {
  return S.kv.active || null;
}

export async function setActive(a) {
  await setKV('active', a || undefined);
}

/**
 * Laufende Session abschließen: Session + Pflanzen speichern.
 * → { session, plants }
 */
let finishing = null;
export function finishActive(now = Date.now()) {
  if (!finishing) finishing = _finishActive(now).finally(() => { finishing = null; });
  return finishing;
}

async function _finishActive(now) {
  const a = active();
  if (!a) return null;
  const f = finalize(a, now);
  const sessionId = uid();
  const parts = plantsForMinutes(f.minutes);
  const plants = parts.map((p, i) => ({
    id: uid(),
    sessionId,
    species: a.species,
    region: a.region,
    variant: i === 0 && a.variant ? a.variant : pickVariant(a.species),
    stage: p.stage,
    minutes: p.minutes,
    tagId: a.tagId,
    createdAt: f.endedAt + i, // eindeutige Reihenfolge
  }));
  const session = {
    id: sessionId,
    tagId: a.tagId,
    region: a.region,
    species: a.species,
    mode: a.mode,
    targetMin: a.targetMin,
    startedAt: f.segments[0]?.[0] ?? a.createdAt,
    endedAt: f.endedAt,
    segments: f.segments,
    minutes: f.minutes,
    tokens: tokensFor(f.minutes),
    plantIds: plants.map((p) => p.id),
  };
  const ops = [{ store: 'kv', del: 'active' }];
  if (f.ms > 0) {
    ops.push({ store: 'sessions', put: session });
    for (const p of plants) ops.push({ store: 'plants', put: p });
  }
  await db.write(ops);
  delete S.kv.active;
  if (f.ms > 0) {
    S.sessions.push(session);
    S.plants.push(...plants);
  }
  emit();
  return { session, plants };
}

export async function deleteSession(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  const ops = [{ store: 'sessions', del: id }];
  for (const pid of s.plantIds || []) ops.push({ store: 'plants', del: pid });
  for (const p of S.plants) if (p.sessionId === id && !(s.plantIds || []).includes(p.id)) ops.push({ store: 'plants', del: p.id });
  const { adjust } = deletePreview(id);
  if (adjust !== tokenAdjust()) {
    ops.push({ store: 'kv', put: { key: 'tokenAdjust', value: adjust } });
    S.kv.tokenAdjust = adjust;
  }
  await db.write(ops);
  S.sessions = S.sessions.filter((x) => x.id !== id);
  S.plants = S.plants.filter((p) => p.sessionId !== id);
  emit();
}

/**
 * Tag einer abgeschlossenen Session nachträglich ändern (ab 0.5.4): Session und alle ihre
 * Pflanzen (plantIds und sessionId) wechseln in einer IndexedDB-Transaktion. Tokens, Stufe,
 * Minuten und Platz bleiben unverändert (der Platz hängt nur an der Pflanzen-ID).
 * Zieltag muss existieren und darf nicht gelöscht sein. → { session, plantCount, changed }
 */
export async function retagSession(sessionId, tagId) {
  const s = S.sessions.find((x) => x.id === sessionId);
  if (!s) throw new Error('Diese Session gibt es nicht mehr.');
  const t = tagById(tagId);
  if (!t || t.deleted) throw new Error('Diesen Tag gibt es nicht mehr.');
  const ids = new Set(s.plantIds || []);
  const plants = S.plants.filter((p) => p.sessionId === sessionId || ids.has(p.id));
  if (s.tagId === tagId && plants.every((p) => p.tagId === tagId)) return { session: s, plantCount: plants.length, changed: false };
  const session = { ...s, tagId };
  const moved = plants.map((p) => ({ ...p, tagId }));
  const ops = [{ store: 'sessions', put: session }, ...moved.map((p) => ({ store: 'plants', put: p }))];
  await db.write(ops);
  S.sessions = S.sessions.map((x) => (x.id === sessionId ? session : x));
  const byId = new Map(moved.map((p) => [p.id, p]));
  S.plants = S.plants.map((p) => byId.get(p.id) || p);
  emit();
  return { session, plantCount: moved.length, changed: true };
}

// --- Backup ----------------------------------------------------------------
export function exportData() {
  return buildExport(S);
}

export function validateBackup(obj) {
  return checkBackup(obj);
}

/** Ersetzt alle Daten. Laufende Session und Backup-Datum bleiben lokal. */
export async function importData(obj) {
  checkBackup(obj);
  const d = obj.data;
  const keep = { lastBackupAt: S.kv.lastBackupAt, active: S.kv.active };
  const ops = db.STORES.map((store) => ({ store, clear: true }));
  for (const t of d.tags) ops.push({ store: 'tags', put: t });
  for (const s of d.sessions) ops.push({ store: 'sessions', put: s });
  for (const p of d.plants) ops.push({ store: 'plants', put: p });
  for (const r of importableKV(d.kv)) ops.push({ store: 'kv', put: { key: r.key, value: r.value } });
  for (const [key, value] of Object.entries(keep)) if (value !== undefined) ops.push({ store: 'kv', put: { key, value } });
  await db.write(ops);
  await init();
  emit();
}

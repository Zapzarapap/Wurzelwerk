// Tests für die Fehlerbehebungen aus v0.4.0 (QA-Runde).
process.env.TZ = 'Europe/Berlin';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenBalance, tokensAfterDelete } from '../js/growth.js';
import { plural, plantSummary, sessionDayLabel } from '../js/text.js';
import { buildExport, validateBackup, importableKV, importErrorMessage, backupStatus } from '../js/backup.js';
import { buildScene } from '../js/scenekit/engine.js';
import { SCENES } from '../js/scenes/index.js';
import { fmtDuration, fmtTime } from '../js/format.js';
import { sessionMsIn } from '../js/stats.js';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 86400000;

// 1 – Kontostand nie negativ
test('Kontostand wird nie negativ, Löschen gleicht ausgegebene Tokens aus', () => {
  assert.equal(tokenBalance(100, 300), 0);
  assert.equal(tokenBalance(500, 300), 200);
  // 400 verdient, 300 ausgegeben → 100 frei; Session mit 250 Tokens löschen
  const r = tokensAfterDelete(400, 300, 0, 250);
  assert.equal(r.lost, 100);
  assert.equal(r.alreadySpent, 150);
  assert.equal(tokenBalance(400 - 250, 300, r.adjust), 0);
  // danach verdiente Tokens zählen sofort
  assert.equal(tokenBalance(400 - 250 + 30, 300, r.adjust), 30);
  // genug Guthaben: kein Ausgleich
  const ok = tokensAfterDelete(1000, 300, 0, 100);
  assert.deepEqual(ok, { lost: 100, alreadySpent: 0, adjust: 0 });
});

// 2 – Backup-Erinnerung
test('Backup-Erinnerung: ab 7 Tagen bzw. ohne Backup mit Sessions', () => {
  const now = Date.UTC(2026, 10, 14);
  assert.deepEqual(backupStatus({}, 0, now), { due: false, days: null });
  assert.deepEqual(backupStatus({}, 3, now), { due: true, days: null });
  assert.equal(backupStatus({ lastBackupAt: now - 6 * DAY }, 3, now).due, false);
  assert.equal(backupStatus({ lastBackupAt: now - 7 * DAY }, 3, now).due, true);
});

// 3 + 4 – Import-Validierung und laufende Session
const good = () => ({
  app: 'wurzelwerk', format: 1, exportedAt: '2026-11-14T10:00:00Z',
  data: {
    tags: [{ id: 't1', name: 'Uni' }],
    sessions: [{ id: 's1', segments: [[1, 2]] }],
    plants: [{ id: 'p1', species: 'monstera', region: 'pflanzenhandlung', stage: 3, variant: null, createdAt: 1, minutes: 60 }],
    kv: [{ key: 'purchases', value: [] }, { key: 'active', value: { x: 1 } }, { key: 'lastBackupAt', value: 5 }],
  },
});

test('Import prüft id/key und meldet Fehler auf Deutsch', () => {
  assert.equal(validateBackup(good()).sessions, 1);
  const cases = [
    [(d) => { d.data.tags[0] = { name: 'x' }; }, /Tags.*Kennung/],
    [(d) => { d.data.plants.push({ species: 'monstera' }); }, /Pflanzen.*Kennung/],
    [(d) => { d.data.kv.push({ value: 1 }); }, /Einstellungen.*Kennung/],
    [(d) => { d.data.plants.push({ ...d.data.plants[0] }); }, /doppelt/],
    [(d) => { d.data.sessions[0].segments = [[5, 'x']]; }, /ungültige Zeiten/],
    [(d) => { delete d.data.kv; }, /unvollständig/],
    [(d) => { d.app = 'x'; }, /keine Wurzelwerk-Backup-Datei/],
  ];
  for (const [mut, re] of cases) {
    const d = good();
    mut(d);
    assert.throws(() => validateBackup(d), (e) => re.test(e.message) && e.userMessage === true);
  }
});

test('Technische Fehler werden verständlich übersetzt (kein englischer Rohtext)', () => {
  const dom = { name: 'DataError', message: 'Failed to execute put on IDBObjectStore: Evaluating the object store key path did not yield a value.' };
  assert.doesNotMatch(importErrorMessage(dom), /IDB|Failed|key path/);
  assert.match(importErrorMessage(new SyntaxError('Unexpected token')), /kein lesbares JSON/);
  assert.match(importErrorMessage(new Error('Transaction aborted')), /nicht gespeichert/);
});

test('Laufende Session wird weder exportiert noch importiert', () => {
  const S = { tags: [], sessions: [], plants: [], kv: { active: { a: 1 }, lastBackupAt: 1, purchases: [] } };
  const keys = buildExport(S).data.kv.map((r) => r.key);
  assert.deepEqual(keys, ['purchases']);
  assert.deepEqual(importableKV(good().data.kv).map((r) => r.key), ['purchases']);
});

// 5 – doppelte Tag-Namen
test('Tag-Namen: Duplikate (ohne Groß/Klein) und leere Namen werden abgelehnt', async () => {
  const store = await import('../js/store.js');
  store.S.tags = [{ id: 'a', name: 'Uni', order: 0, createdAt: 1 }, { id: 'b', name: 'Alt', order: 1, createdAt: 2, deleted: true }];
  assert.equal(store.tagNameTaken(' uni '), true);
  assert.equal(store.tagNameTaken('Uni', 'a'), false); // eigener Name beim Bearbeiten
  assert.equal(store.tagNameTaken('alt'), false); // gelöschte Tags blockieren nicht
  await assert.rejects(store.saveTag({ name: 'UNI' }), /schon einen Tag/);
  await assert.rejects(store.saveTag({ name: '   ' }), /Namen/);
});

// 6 + 7 – Texte
test('Pluralisierung', () => {
  assert.equal(plural(1, 'Session'), '1 Session');
  assert.equal(plural(2, 'Session'), '2 Sessions');
  assert.equal(plural(1, 'Pflanze'), '1 Pflanze');
  assert.equal(plural(0, 'Pflanze'), '0 Pflanzen');
  assert.equal(plural(1, 'Tag'), '1 Tag');
  assert.equal(plural(3, 'Tag'), '3 Tage');
  assert.equal(plural(1, 'Tag', 'Tags'), '1 Tag');
  assert.equal(plural(2, 'Tag', 'Tags'), '2 Tags');
  assert.equal(plural(1, 'Token'), '1 Token');
  assert.equal(plural(1200, 'Token'), '1.200 Tokens');
});

test('Ergebnistext fasst gleiche Pflanzen zusammen', () => {
  const names = { monstera: 'Monstera' };
  const p = [{ species: 'monstera', stage: 5 }, { species: 'monstera', stage: 5 }, { species: 'monstera', stage: 2 }];
  assert.equal(plantSummary(p, names), '2× Monstera Stufe 5 · Monstera Stufe 2');
  assert.equal(plantSummary([p[0]], names), 'Monstera Stufe 5');
});

// 9 – Sessions über Mitternacht
test('Session über Mitternacht: Anteil am Folgetag wird ausgewiesen', () => {
  const s = +new Date(2026, 10, 13, 23, 30), e = +new Date(2026, 10, 14, 0, 45);
  const sess = { startedAt: s, endedAt: e, segments: [[s, e]] };
  const a = +new Date(2026, 10, 14), b = +new Date(2026, 10, 15);
  const ms = sessionMsIn(sess, a, b);
  const l = sessionDayLabel(sess, a, b, ms, fmtTime, fmtDuration);
  assert.equal(l.range, '23:30–00:45');
  assert.equal(l.part, '45 min an diesem Tag');
  const inside = { startedAt: a + 3600000, endedAt: a + 7200000 };
  assert.equal(sessionDayLabel(inside, a, b, 3600000, fmtTime, fmtDuration).part, null);
});

// 10 – Orte füllen den Bildschirm, Pflanzen ziehen dabei nicht um
const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `p-${i}`, createdAt: 1000 + i }));
for (const region of ['pflanzenhandlung', 'gewaechshaus', 'blumenwiese', 'wald']) {
  test(`${region}: Fläche füllt den Bildschirm, Stellplätze bleiben gleich`, () => {
    for (const n of [3, 60, 500]) {
      const base = buildScene(SCENES[region], mk(n));
      const fill = { W: base.W, H: Math.round(base.W * 1.6) }; // hochkantes Handy
      const big = buildScene(SCENES[region], mk(n), fill);
      assert.ok(big.W >= fill.W && big.H >= fill.H, `${n}: ${big.W}×${big.H}`);
      assert.ok(big.W <= fill.W + 1 && big.H <= fill.H + 1, `${n}: nicht größer als nötig`);
      const pos = (l) => Object.fromEntries(l.items.map((i) => [i.plant.id, [i.x - l.ox, i.y - l.oy, i.spot.key]]));
      const a = pos(base), b = pos(big);
      for (const [id, v] of Object.entries(a)) assert.deepEqual(b[id], v, `${region} ${id}`);
    }
  });
}

// 11 – Desktop-Tabbar, Tippflächen, Kontrast (CSS-Regeln vorhanden)
test('CSS: Tabbar auf Inhaltsbreite, Tippflächen ≥ 44 px, dunkleres Button-Grün', () => {
  const css = readFileSync(join(APP, 'css/style.css'), 'utf8');
  assert.match(css, /#tabbar \{ padding-left: calc\(\(100% - 640px\) \/ 2\)/);
  assert.match(css, /\.icon-btn \{[^}]*width: 44px; height: 44px;/);
  assert.match(css, /\.btn \{ min-height: 44px; \}/);
  assert.match(css, /--btn: #3a7a3e/);
});

// WCAG-Kontrast der wichtigsten Paare
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
test('Kontrast ≥ 4,5:1 (hell und dunkel)', () => {
  const pairs = [
    ['#fbf6ea', '#3a7a3e'], ['#fbf6ea', '#357238'], // Creme auf Primärbutton hell/dunkel
    ['#6f5843', '#f3ead8'], ['#6f5843', '#ebdfc6'], ['#6f5843', '#fbf6ea'], // gedämpft hell
    ['#b09a80', '#2c2520'], ['#b09a80', '#1f1a17'], // gedämpft dunkel
    ['#2e6e36', '#fbf6ea'], ['#86c062', '#2c2520'], // aktiver Tab
    ['#9a4a2c', '#fbf6ea'], ['#e08a5e', '#2c2520'], // Warnzeile
    ['#8a6410', '#fbf6ea'], // Token-Zahl
  ];
  for (const [fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${fg} auf ${bg}: ${ratio(fg, bg).toFixed(2)}`);
});

test('Manifest: id und Shortcut „Session starten“', () => {
  const m = JSON.parse(readFileSync(join(APP, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.id, './');
  assert.equal(m.shortcuts[0].name, 'Session starten');
  const html = readFileSync(join(APP, 'index.html'), 'utf8');
  assert.ok((html.match(/apple-touch-startup-image/g) || []).length >= 8);
  assert.match(html, /favicon\.svg/);
});

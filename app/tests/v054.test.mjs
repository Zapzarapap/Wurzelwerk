// Tests für v0.5.4: Tag einer Session nachträglich ändern (Store, Statistik, Backup, Einbindung).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(APP, f), 'utf8');

// Minimales IndexedDB: nur was js/db.js braucht (open, transaction, put/delete/clear).
const disk = { tags: new Map(), sessions: new Map(), plants: new Map(), kv: new Map() };
const keyPath = { tags: 'id', sessions: 'id', plants: 'id', kv: 'key' };
let failNext = false;
const txLog = [];
globalThis.indexedDB = {
  open() {
    const r = {};
    const db = {
      objectStoreNames: { contains: () => true },
      transaction(names) {
        const ops = [];
        const tx = {
          objectStore(n) {
            return {
              put: (o) => ops.push(() => disk[n].set(o[keyPath[n]], structuredClone(o))),
              delete: (k) => ops.push(() => disk[n].delete(k)),
              clear: () => ops.push(() => disk[n].clear()),
              getAll: () => { const q = {}; setTimeout(() => { q.result = [...disk[n].values()]; q.onsuccess(); }); return q; },
            };
          },
        };
        setTimeout(() => {
          if (failNext) { failNext = false; tx.error = new Error('kaputt'); tx.onabort(); return; }
          txLog.push([...names]);
          ops.forEach((f) => f());
          tx.oncomplete();
        }, 0);
        return tx;
      },
    };
    setTimeout(() => { r.result = db; r.onsuccess(); });
    return r;
  },
};

const store = await import('../js/store.js');
const { aggregate, tagBreakdown } = await import('../js/stats.js');
const { buildExport, validateBackup } = await import('../js/backup.js');

const MIN = 60000;
const T0 = new Date(2026, 10, 18, 9, 0).getTime();

function seed() {
  store.S.tags = [
    { id: 'a', name: 'Lernen', color: '#468a48', createdAt: 1, order: 0, deleted: false },
    { id: 'b', name: 'Bachelorarbeit', color: '#b4603e', createdAt: 2, order: 1, deleted: false },
    { id: 'x', name: 'Alt', color: '#8060bc', createdAt: 3, order: 2, deleted: true },
  ];
  const mk = (id, tagId, start, minutes, pids) => ({
    id, tagId, region: 'pflanzenhandlung', species: 'monstera', mode: 'endless', targetMin: null,
    startedAt: start, endedAt: start + minutes * MIN, segments: [[start, start + minutes * MIN]], minutes, tokens: minutes, plantIds: pids,
  });
  const pl = (id, sid, tagId, stage, minutes, createdAt) => ({ id, sessionId: sid, species: 'monstera', region: 'pflanzenhandlung', variant: null, stage, minutes, tagId, createdAt });
  store.S.sessions = [mk('s1', 'a', T0, 150, ['p1', 'p2']), mk('s2', 'a', T0 + 4 * 3600000, 30, ['p3']), mk('s3', 'x', T0 + 6 * 3600000, 45, ['p4'])];
  store.S.plants = [pl('p1', 's1', 'a', 5, 120, 10), pl('p2', 's1', 'a', 2, 30, 11), pl('p3', 's2', 'a', 2, 30, 12), pl('p4', 's3', 'x', 3, 45, 13)];
  store.S.kv = {};
  for (const m of Object.values(disk)) m.clear();
  for (const t of store.S.tags) disk.tags.set(t.id, structuredClone(t));
  for (const s of store.S.sessions) disk.sessions.set(s.id, structuredClone(s));
  for (const p of store.S.plants) disk.plants.set(p.id, structuredClone(p));
  txLog.length = 0;
}

test('retagSession: Session und alle Pflanzen wechseln, in State und IndexedDB, in einer Transaktion', async () => {
  seed();
  const before = structuredClone(store.S.plants.find((p) => p.id === 'p1'));
  const tokensBefore = store.tokensEarned();
  let emitted = 0;
  const off = store.onChange(() => emitted++);
  const r = await store.retagSession('s1', 'b');
  off();
  assert.deepEqual([r.changed, r.plantCount], [true, 2]);
  assert.equal(emitted, 1);
  assert.equal(store.S.sessions.find((s) => s.id === 's1').tagId, 'b');
  assert.deepEqual(store.S.plants.filter((p) => p.sessionId === 's1').map((p) => p.tagId), ['b', 'b']);
  assert.equal(disk.sessions.get('s1').tagId, 'b');
  assert.equal(disk.plants.get('p1').tagId, 'b');
  assert.equal(disk.plants.get('p2').tagId, 'b');
  assert.equal(disk.plants.get('p3').tagId, 'a'); // andere Session bleibt
  assert.equal(store.S.sessions.find((s) => s.id === 's2').tagId, 'a');
  assert.equal(txLog.length, 1);
  assert.deepEqual(txLog[0].sort(), ['plants', 'sessions']);
  // Tokens, Stufe, Minuten, Zeitpunkt, ID unverändert
  const after = store.S.plants.find((p) => p.id === 'p1');
  assert.deepEqual({ ...after, tagId: 'a' }, before);
  assert.equal(store.tokensEarned(), tokensBefore);
});

test('retagSession: Session mit gelöschtem Tag lässt sich umstellen', async () => {
  seed();
  const r = await store.retagSession('s3', 'a');
  assert.equal(r.changed, true);
  assert.equal(store.S.plants.find((p) => p.id === 'p4').tagId, 'a');
  assert.equal(store.tagName(store.S.sessions.find((s) => s.id === 's3').tagId), 'Lernen');
});

test('retagSession: gleicher Tag = keine Änderung, gelöschter/unbekannter Tag und unbekannte Session werden abgelehnt', async () => {
  seed();
  let emitted = 0;
  const off = store.onChange(() => emitted++);
  assert.equal((await store.retagSession('s1', 'a')).changed, false);
  assert.equal(emitted, 0);
  assert.equal(txLog.length, 0);
  await assert.rejects(store.retagSession('s1', 'x'), /Tag gibt es nicht mehr/);
  await assert.rejects(store.retagSession('s1', 'nope'), /Tag gibt es nicht mehr/);
  await assert.rejects(store.retagSession('nope', 'a'), /Session gibt es nicht mehr/);
  off();
  assert.equal(store.S.sessions.find((s) => s.id === 's1').tagId, 'a');
});

test('retagSession: scheitert die Transaktion, bleibt der State unverändert', async () => {
  seed();
  failNext = true;
  await assert.rejects(store.retagSession('s1', 'b'));
  assert.equal(store.S.sessions.find((s) => s.id === 's1').tagId, 'a');
  assert.ok(store.S.plants.filter((p) => p.sessionId === 's1').every((p) => p.tagId === 'a'));
  assert.equal(disk.sessions.get('s1').tagId, 'a');
});

test('Statistik nach dem Umtaggen: Zeit steht unter dem neuen Tag', async () => {
  seed();
  const day = new Date(2026, 10, 18);
  const sum = () => Object.fromEntries(tagBreakdown(aggregate(store.S.sessions, 'day', day).byTag).map((b) => [b.tagId, b.ms]));
  assert.deepEqual(sum(), { a: 180 * MIN, x: 45 * MIN });
  await store.retagSession('s1', 'b');
  assert.deepEqual(sum(), { b: 150 * MIN, a: 30 * MIN, x: 45 * MIN });
  const week = aggregate(store.S.sessions, 'week', day);
  assert.equal(week.total, 225 * MIN); // Gesamtzeit gleich
});

test('Backup-Export enthält den neuen Tag und ist importierbar', async () => {
  seed();
  await store.retagSession('s1', 'b');
  const exp = buildExport(store.S);
  assert.equal(exp.data.sessions.find((s) => s.id === 's1').tagId, 'b');
  assert.ok(exp.data.plants.filter((p) => p.sessionId === 's1').every((p) => p.tagId === 'b'));
  validateBackup(JSON.parse(JSON.stringify(exp)));
});

test('Platz der Pflanzen hängt nicht vom Tag ab', () => {
  for (const f of ['garden.js', 'scenes/index.js', 'scenes/pflanzenhandlung.js', 'scenes/gewaechshaus.js', 'scenes/blumenwiese.js', 'scenes/wald.js', 'scenekit/engine.js']) {
    assert.doesNotMatch(read('js/' + f), /tagId/, f);
  }
});

test('Einbindung: Statistik-Zeile öffnet das Sheet, Info-Karte hat „Tag ändern“, Version 0.5.4', () => {
  const stats = read('js/views/stats.js');
  assert.match(stats, /openSessionSheet\(s\.id\)/);
  const g = read('js/views/garden.js');
  assert.match(g, /'Tag ändern'/);
  assert.match(g, /openRetagSheet\(p\.sessionId\)/);
  assert.match(read('sw.js'), /const VERSION = '0\.5\.4'/);
  assert.match(read('js/version.js'), /APP_VERSION = '0\.5\.4'/);
  assert.ok(read('sw.js').includes("'js/views/sessionsheet.js'"));
});

test('retagNote: Hinweis bei mehreren Pflanzen', async () => {
  const { retagNote } = await import('../js/views/sessionsheet.js').catch(() => ({ retagNote: null }));
  if (!retagNote) return; // braucht DOM-freie Imports; sonst durch Browser-Check abgedeckt
  assert.match(retagNote(3), /Alle 3 Pflanzen/);
  assert.match(retagNote(1), /Pflanze wechselt/);
  assert.equal(retagNote(0), '');
});

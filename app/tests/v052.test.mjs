// Tests für die Fehlerbehebungen aus v0.5.2 (QA-Runde): Wald-Performance (pixelgleich),
// Licht-Chip, Tippen über die Sprite-Silhouette, Backup-Import der Pflanzen,
// Update-Fluss des Service Workers, Weltrand der Blumenwiese.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');

// Canvas-Attrappe, die die Pixel aus putImageData mitschneidet (für Pixel-Vergleiche)
function fakeCanvas(w = 1, h = 1) {
  const c = { width: w, height: h, _data: null };
  const noop = () => {};
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createImageData') return (W, H) => ({ data: new Uint8ClampedArray(W * H * 4), width: W, height: H });
      if (k === 'getImageData') return (x, y, W, H) => ({ data: new Uint8ClampedArray(W * H * 4) });
      if (k === 'putImageData') return (img) => { c._data = img.data.slice(); };
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop: noop });
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  c.getContext = () => ctx;
  return c;
}
globalThis.document ||= { createElement: () => fakeCanvas() };

const { buildScene, hitTest, spriteDist } = await import('../js/scenekit/engine.js');
const { SCENES } = await import('../js/scenes/index.js');
const { validateBackup } = await import('../js/backup.js');
const { lightFromElevation } = await import('../js/sun.js');
const { PLANTS } = await import('../js/plants.js');

const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `p-${i}`, createdAt: 1000 + i }));
const fnv = (d) => { let h = 2166136261; if (d) for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };

// --- 1 Wald-Performance: Ergebnis unverändert ------------------------------------
// Referenz: Ausgabe von paint() in v0.5.1 (vor Kachel-Cache / Vorfilter / schnellerem mix()).
// Blumenwiese: mit dem um 2 px breiteren Seitenrand aus v0.5.2. Bei gewollten Änderungen am
// Aussehen einer Region hier neu setzen (node-Skript: Hash von bg.canvas/bg.glow wie unten).
const GOLDEN = {
  'pflanzenhandlung:0': '257x359:4ee189f6:ab21447', 'pflanzenhandlung:60': '417x619:f9be39f0:8d29601d', 'pflanzenhandlung:300': '897x1399:b68a60fc:e51788ef',
  'gewaechshaus:0': '209x333:76a60e72:8b915e75', 'gewaechshaus:60': '353x624:ff3765a9:285d809f', 'gewaechshaus:300': '785x1352:452b56b3:c0e51cbd',
  'blumenwiese:0': '309x257:78a30b7b:af076d31', 'blumenwiese:60': '437x549:ff93c599:d78ea3b1', 'blumenwiese:300': '693x1131:cd95fb5:618cd5c9',
  'wald:0': '209x343:f0b2dba5:f64b82fa', 'wald:60': '465x614:7ec8af93:2f9784f6', 'wald:300': '849x1154:6a590fd1:b93ac35f',
};

test('Hintergründe pixelgleich zu v0.5.1 (Wald: Kachel-Cache über wechselnde Versätze)', () => {
  for (const region of Object.keys(SCENES)) {
    const R = SCENES[region];
    for (const n of [0, 60, 300]) {
      const base = buildScene(R, mk(n));
      const sc = buildScene(R, mk(n), { W: base.W + 37, H: Math.round(base.H * 1.3) });
      const bg = R.paint(sc);
      assert.equal(`${sc.W}x${sc.H}:${fnv(bg.canvas._data)}:${fnv(bg.glow._data)}`, GOLDEN[`${region}:${n}`], `${region} n=${n}`);
    }
  }
});

test('Wald: Boden aus dem Kachel-Cache = frisch berechnet, auch bei anderem Versatz', () => {
  const R = SCENES.wald;
  const a = buildScene(R, mk(120), { W: 700, H: 900 });
  const first = fnv(R.paint(a).canvas._data);
  // andere Szenen dazwischen (andere ox/oy, Kacheln werden wiederverwendet)
  R.paint(buildScene(R, mk(40), { W: 333, H: 517 }));
  R.paint(buildScene(R, mk(400)));
  assert.equal(fnv(R.paint(a).canvas._data), first);
});

test('Wald: 300 Pflanzen in Weltgröße eines iPhones malen dauert (Node) unter 1,5 s', () => {
  const R = SCENES.wald;
  const sc = buildScene(R, mk(300), { W: 900, H: 1260 });
  const t = performance.now();
  R.paint(sc);
  // großzügig für langsame Testrechner; v0.5.1 brauchte hier ~5 s
  assert.ok(performance.now() - t < 1500, `${Math.round(performance.now() - t)} ms`);
});

// --- 2 Licht-Chip ----------------------------------------------------------------
test('Licht-Chip: kurze Phasen-Namen und passendes Symbol', async () => {
  const { lightView } = await import('../js/views/garden.js');
  const cases = [[30, true, 'Tag', 'sun'], [2, true, 'Morgenrot', 'horizon'], [2, false, 'Abendrot', 'horizon'], [-9, false, 'Dämmerung', 'moon'], [-30, false, 'Nacht', 'moon']];
  for (const [e, morning, label, icon] of cases) {
    const v = lightView(lightFromElevation(e, morning));
    assert.deepEqual(v, { label, icon }, `e=${e}`);
    assert.ok(v.label.length <= 10, v.label);
  }
  const ui = readFileSync(join(APP, 'js/ui.js'), 'utf8');
  assert.match(ui, /\n {2}horizon: \[/, 'Icon „horizon“ fehlt');
});

// --- 3 Tippen über die Silhouette ------------------------------------------------
/** Maske 32×32 aus einem Rechteck (Sprite-Koordinaten), Fuß in Zeile 31. */
function rectMask(x0, y0, x1, y1, ay = 31) {
  const a = new Uint8Array(1024);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a[y * 32 + x] = 1;
  return { a, w: 32, h: 32, ay, box: { x0, y0, x1, y1 } };
}
const item = (x, y, z, mask, flip = false) => ({ x, y, z, flip, spot: {}, sprite: { mask }, plant: { id: `${x},${y}` } });

test('Tippen: sichtbares Sprite-Pixel trifft, auch weit über der alten Tipp-Fläche', () => {
  // hohe Pflanze: Krone bis Zeile 0 (31 px über dem Fuß), alte Tipp-Fläche nur 20 px hoch
  const tall = item(100, 100, 100, rectMask(4, 0, 27, 31));
  assert.equal(hitTest([tall], 100, 100 - 30), tall);
  assert.equal(hitTest([tall], 100 - 12, 100 - 10), tall); // seitlich außerhalb ±8
  // durchsichtig und weit weg → nichts
  assert.equal(hitTest([tall], 100 - 15, 100 - 10), null);
});

test('Tippen: bei Überlappung gewinnt die vordere (größeres z) Pflanze', () => {
  const back = item(100, 100, 100, rectMask(4, 4, 27, 31));
  const front = item(110, 112, 112, rectMask(4, 4, 27, 31));
  // Punkt auf beiden Silhouetten
  assert.equal(hitTest([back, front], 105, 95), front);
  assert.equal(hitTest([front, back], 105, 95), front);
  // nur hinten sichtbar
  assert.equal(hitTest([back, front], 90, 75), back);
});

test('Tippen: gespiegelte Sprites und Sprites ohne Fuß (Gewächshaus) liegen richtig', () => {
  const m = rectMask(0, 10, 5, 31); // nur linker Rand deckt
  const plain = item(50, 50, 50, m), flipped = item(150, 50, 50, m, true);
  assert.equal(spriteDist(plain, 50 - 14, 45), 0);
  assert.equal(spriteDist(plain, 50 + 13, 45), Infinity);
  assert.equal(spriteDist(flipped, 150 + 13, 45), 0);
  assert.equal(spriteDist(flipped, 150 - 14, 45), Infinity);
  const nofoot = item(50, 50, 50, rectMask(10, 20, 20, 27, 27));
  assert.equal(spriteDist(nofoot, 50, 50), 0); // Zeile 27 = Erdpunkt
  assert.equal(spriteDist(nofoot, 50, 51), Infinity);
});

test('Tippen: knapp daneben zählt mit Toleranz, sonst Fuß-Tipp-Fläche als Rückfall', () => {
  const a = item(100, 100, 100, rectMask(12, 10, 19, 31));
  assert.equal(spriteDist(a, 100 + 6, 95, 3), 3);
  assert.equal(hitTest([a], 100 + 6, 95, { tol: 3 }), a);
  assert.equal(hitTest([a], 100 + 7, 95, { tol: 3 }), a); // ±8 Fuß-Fläche greift
  // ohne Maske (Tests, Sprite noch nicht geladen): alte Fuß-Tipp-Fläche
  const old = { x: 10, y: 10, z: 10, spot: {}, plant: {} };
  assert.equal(hitTest([old], 10, 8), old);
});

test('alle Regionen: Tipp auf sichtbare Pixel trifft die dort vorderste Pflanze; Fuß trifft sich selbst oder die davor sichtbare', () => {
  // künstliche Silhouetten je Pflanze (verschieden breit/hoch), voll belegte Szenen
  const masks = [rectMask(8, 6, 23, 31), rectMask(3, 12, 28, 31), rectMask(11, 0, 20, 31), rectMask(6, 18, 25, 31)];
  let rs = 7; const rnd = () => ((rs = (rs * 1103515245 + 12345) >>> 0) / 4294967296);
  for (const region of Object.keys(SCENES)) {
    const sc = buildScene(SCENES[region], mk(120));
    sc.items.forEach((it, i) => { it.sprite = { mask: masks[i % masks.length] }; });
    const covers = (o, wx, wy) => spriteDist(o, wx, wy) === 0;
    const front = (wx, wy) => { let t = null; for (const o of sc.items) if (covers(o, wx, wy) && (!t || o.z >= t.z)) t = o; return t; };
    for (let k = 0; k < 400; k++) {
      const it = sc.items[Math.floor(rnd() * sc.items.length)];
      const b = it.sprite.mask.box;
      const sx = b.x0 + Math.floor(rnd() * (b.x1 - b.x0 + 1)), sy = b.y0 + Math.floor(rnd() * (b.y1 - b.y0 + 1));
      const wx = it.x - 16 + (it.flip ? 31 - sx : sx) + 0.5, wy = it.y - 31 + sy + 0.5;
      assert.equal(hitTest(sc.items, wx, wy, { tol: 2 }), front(wx, wy), `${region}: (${wx},${wy})`);
    }
    for (const it of sc.items) {
      const got = hitTest(sc.items, it.x, it.y - 2, { tol: 2 });
      assert.ok(got === it || (covers(got, it.x, it.y - 2) && got.z >= it.z), `${region}: Fuß ${it.spot.key}`);
    }
  }
});

// --- 4 Backup-Import: Pflanzen ---------------------------------------------------
const backup = (plant) => ({
  app: 'wurzelwerk', format: 1, exportedAt: '2026-11-15T10:00:00Z',
  data: { tags: [], sessions: [], kv: [], plants: [{ id: 'p1', species: 'mohn', region: 'blumenwiese', stage: 4, variant: 'rot', createdAt: 1731600000000, minutes: 90, ...plant }] },
});

test('Import: gültige Pflanzen (mit, ohne und mit leerer Variante) werden angenommen', () => {
  assert.equal(validateBackup(backup({})).plants, 1);
  assert.equal(validateBackup(backup({ variant: null })).plants, 1);
  assert.equal(validateBackup(backup({ variant: '' })).plants, 1);
  assert.equal(validateBackup(backup({ species: 'monstera', region: 'pflanzenhandlung', variant: undefined, stage: 5 })).plants, 1);
  // alle Arten des Katalogs mit allen Farben
  for (const p of PLANTS) for (const v of [null, ...p.variants])
    validateBackup(backup({ species: p.id, region: p.region, variant: v }));
});

test('Import: ungültige Pflanzen werden mit deutscher Meldung abgelehnt', () => {
  const cases = [
    [{ species: 'gibtsnicht' }, /Pflanze 1 hat eine unbekannte Art \(„gibtsnicht“\)/],
    [{ species: undefined }, /Pflanze 1 hat keine Art/],
    [{ region: 'mond' }, /unbekannten Ort/],
    [{ region: 'wald' }, /Mohn\) gehört nicht zum Ort Wald/],
    [{ region: undefined }, /keinen Ort/],
    [{ stage: 0 }, /ungültige Wachstumsstufe.*1 bis 5/],
    [{ stage: 6 }, /ungültige Wachstumsstufe/],
    [{ stage: 2.5 }, /ungültige Wachstumsstufe/],
    [{ stage: '3' }, /ungültige Wachstumsstufe/],
    [{ createdAt: '2026-11-15' }, /kein gültiges Datum/],
    [{ createdAt: NaN }, /kein gültiges Datum/],
    [{ createdAt: undefined }, /kein gültiges Datum/],
    [{ variant: 'gruen' }, /unbekannte Farbe \(„gruen“\)/],
    [{ variant: 5 }, /unbekannte Farbe/],
  ];
  for (const [patch, re] of cases) {
    assert.throws(() => validateBackup(backup(patch)), (e) => e.userMessage === true && re.test(e.message), JSON.stringify(patch));
  }
  // lange Werte werden gekürzt
  assert.throws(() => validateBackup(backup({ species: 'x'.repeat(200) })), (e) => e.message.length < 140);
});

test('Katalog und Sprite-Manifest haben dieselben Farbvarianten', () => {
  const m = JSON.parse(readFileSync(join(APP, 'data/sprites.json'), 'utf8'));
  for (const p of PLANTS) assert.deepEqual([...(m.species[p.id]?.variants || [])].sort(), [...p.variants].sort(), p.id);
  assert.equal(PLANTS.length, 72);
  assert.equal(PLANTS.reduce((a, p) => a + p.variants.length, 0), 109);
});

test('Sprites: fehlgeschlagene URLs werden gemerkt, unbekannte Arten gar nicht geladen', () => {
  const src = readFileSync(join(APP, 'js/sprites.js'), 'utf8');
  assert.match(src, /failedUrls\.has\(url\)/);
  assert.match(src, /failedUrls\.add\(url\)/);
  assert.match(src, /if \(!plant\) throw/);
  assert.match(src, /alphaMask/);
});

// --- 5 Toasts --------------------------------------------------------------------
test('Toasts: gleiche id ersetzt, höchstens 2 kurze gleichzeitig, Shop fasst zusammen', async () => {
  const ui = await import('../js/ui.js');
  assert.equal(ui.joinNames(['A']), 'A');
  assert.equal(ui.joinNames(['A', 'B']), 'A und B');
  assert.equal(ui.joinNames(['A', 'B', 'C']), 'A, B und C');
  // Mini-DOM für toast()
  const root = { kids: [], append(el) { this.kids.push(el); el.parent = this; } };
  const mkEl = (tag) => ({ tag, children: [], attrs: {}, classList: { add() {}, remove() {}, toggle() {} }, style: {}, append(...c) { this.children.push(...c); }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {}, remove() { const i = root.kids.indexOf(this); if (i >= 0) root.kids.splice(i, 1); } });
  const prev = globalThis.document, prevNode = globalThis.Node;
  globalThis.Node = class {};
  globalThis.document = { getElementById: (id) => (id === 'toasts' ? root : null), createElement: (t) => Object.setPrototypeOf(mkEl(t), globalThis.Node.prototype), createTextNode: (t) => ({ t }) };
  try {
    ui.toast('Gewächshaus freigeschaltet!', 50, { id: 'shop' });
    ui.toast('Gewächshaus und Tomate freigeschaltet!', 50, { id: 'shop' });
    assert.equal(root.kids.length, 1);
    ui.toast('a', 50); ui.toast('b', 50); ui.toast('c', 50);
    assert.equal(root.kids.length, 2);
    ui.toast('Neue Version verfügbar', Infinity, { id: 'update', action: { label: 'Neu laden', onClick() {} } });
    ui.toast('d', 50); ui.toast('e', 50);
    assert.equal(root.kids.length, 3); // 2 kurze + der dauerhafte Update-Hinweis
  } finally {
    globalThis.document = prev;
    globalThis.Node = prevNode;
  }
  const shop = readFileSync(join(APP, 'js/views/shop.js'), 'utf8');
  assert.match(shop, /id: 'shop'/);
});

// --- 6 Update-Fluss --------------------------------------------------------------
test('Service Worker: wartet auf „Neu laden“ statt sofort zu übernehmen (außer von ≤ 0.5.1)', () => {
  const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
  const main = readFileSync(join(APP, 'js/main.js'), 'utf8');
  assert.match(sw, /if \(await legacyActive\(\)\) await self\.skipWaiting\(\);/);
  assert.doesNotMatch(sw.replace(/if \(await legacyActive\(\)\) await self\.skipWaiting\(\);/, ''), /^\s*await self\.skipWaiting\(\);/m);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(main, /postMessage\(\{ type: 'SKIP_WAITING' \}\)/);
  assert.match(main, /Neue Version verfügbar/);
  assert.match(main, /controllerchange/);
  // Legacy-Erkennung: 0.5.1 und älter ja, 0.5.2 und neuer nein
  const body = /async function legacyActive\(\) \{([\s\S]*?)\n\}/.exec(sw)[1];
  const legacy = (keys, own) => new Function('caches', 'CACHE', `return (async () => {${body}})();`)({ keys: async () => keys }, own);
  return Promise.all([
    legacy(['wurzelwerk-0.5.1'], 'wurzelwerk-0.5.2').then((v) => assert.equal(v, true)),
    legacy(['wurzelwerk-0.4.9'], 'wurzelwerk-0.5.2').then((v) => assert.equal(v, true)),
    legacy(['wurzelwerk-0.5.2'], 'wurzelwerk-0.5.3').then((v) => assert.equal(v, false)),
    legacy(['wurzelwerk-0.5.2', 'wurzelwerk-0.5.3'], 'wurzelwerk-0.5.3').then((v) => assert.equal(v, false)),
    legacy(['wurzelwerk-0.10.0'], 'wurzelwerk-0.10.1').then((v) => assert.equal(v, false)),
    legacy([], 'wurzelwerk-0.5.2').then((v) => assert.equal(v, false)),
  ]);
});

test('Version 0.5.2', () => {
  assert.match(readFileSync(join(APP, 'sw.js'), 'utf8'), /const VERSION = '0\.5\.2'/);
  assert.match(readFileSync(join(APP, 'js/version.js'), 'utf8'), /APP_VERSION = '0\.5\.2'/);
});

// --- 7 Weltrand --------------------------------------------------------------------
test('alle Regionen: Pflanzen-Sprites (32×32 um den Fuß) liegen ganz in der Welt', () => {
  for (const region of Object.keys(SCENES)) {
    const R = SCENES[region];
    for (const n of [0, 8, 40, 120, 300]) for (const fill of [null, { W: 390, H: 553 }, { W: 1170, H: 1659 }]) {
      const sc = buildScene(R, mk(n), fill);
      for (const s of sc.spots) {
        const top = s.y - ((s.nofoot ?? R.nofoot) ? 27 : 31);
        assert.ok(s.x - 16 >= 0 && s.x + 15 < sc.W && top >= 0 && s.y < sc.H, `${region} n=${n} ${s.key}: (${s.x},${s.y}) in ${sc.W}×${sc.H}`);
      }
    }
  }
});

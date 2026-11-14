// Szenen-System (app/js/scenekit, app/js/scenes): Stabilität, Determinismus,
// Tipp-Flächen, Deko-Regeln und Rendern ohne Fehler (mit Canvas-Attrappe).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScene, hitTest, plantBox, overlaps, gridSequence, scatter, HIT } from '../js/scenekit/engine.js';
import { hashString, rngFor, rng } from '../js/scenekit/rng.js';
import { SCENES } from '../js/scenes/index.js';

const REGIONS = Object.keys(SCENES);
const mk = (n, prefix = 'p') => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, createdAt: 1000 + i }));
/** Position in Inhaltskoordinaten (unabhängig vom Auffüllen/Zentrieren) */
const pos = (sc) => new Map(sc.items.map((i) => [i.plant.id, `${i.x - sc.ox},${i.y - sc.oy},${i.spot.key},${i.flip}`]));

test('Register: vier Regionen mit vollständiger API', () => {
  assert.deepEqual(REGIONS, ['pflanzenhandlung', 'gewaechshaus', 'blumenwiese', 'wald']);
  for (const [id, m] of Object.entries(SCENES)) {
    assert.equal(m.id, id);
    for (const fn of ['section', 'paint']) assert.equal(typeof m[fn], 'function', `${id}.${fn}`);
  }
});

test('Hash/RNG stabil', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
  const v = rngFor('x')();
  assert.ok(v >= 0 && v < 1);
  assert.equal(rngFor('x')(), v);
  assert.equal(rng('a:b')(), rng('a:b')());
});

test('gridSequence: stabil, ohne Doppel, präfix-gleich', () => {
  const g = { cw: 160, ch: 200, aspect: 1.25, start: [1, 1] };
  const a = gridSequence(30, g), b = gridSequence(50, g);
  assert.deepEqual(b.slice(0, 30), a);
  assert.equal(new Set(b.map(String)).size, 50);
});

test('scatter: Tipp-Flächen überlappen nicht und liegen im Rechteck', () => {
  for (let k = 0; k < 20; k++) {
    const pts = scatter(64, 64, rng('t' + k), { n: 6 });
    for (const p of pts) assert.ok(p.x - HIT.dx >= 0 && p.x + HIT.dx <= 64 && p.y - HIT.up >= 0 && p.y <= 64);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++)
      assert.ok(Math.abs(pts[i].x - pts[j].x) > 2 * HIT.dx || Math.abs(pts[i].y - pts[j].y) > HIT.up);
  }
});

for (const region of REGIONS) {
  const R = SCENES[region];

  test(`${region}: Abschnitte sind rein (nur vom Index abhängig)`, () => {
    for (let i = 0; i < 30; i++) assert.deepEqual(R.section(i), R.section(i));
    // Abschnitte überlappen sich nicht
    const rects = Array.from({ length: 30 }, (_, i) => R.section(i).rect);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${i}/${j}`);
    }
  });

  test(`${region}: jede Pflanze hat einen eigenen Stellplatz, Spots liegen im Abschnitt`, () => {
    for (const n of [0, 1, 10, 60, 300]) {
      const sc = buildScene(R, mk(n));
      assert.equal(sc.items.length, n);
      assert.equal(new Set(sc.items.map((i) => i.spot.key)).size, n, `n=${n}`);
      assert.ok(sc.capacity >= n);
      for (const s of sc.sections) for (const p of s.spots) {
        assert.ok(p.x >= s.rect.x && p.x <= s.rect.x + s.rect.w && p.y >= s.rect.y && p.y <= s.rect.y + s.rect.h, `${p.key} außerhalb`);
      }
      for (const it of sc.items) assert.ok(it.x >= 0 && it.x <= sc.W && it.y >= 0 && it.y <= sc.H);
      for (let i = 1; i < sc.items.length; i++) assert.ok(sc.items[i].z >= sc.items[i - 1].z, 'z-sortiert');
      for (let i = 1; i < sc.pieces.length; i++) assert.ok(sc.pieces[i].z >= sc.pieces[i - 1].z, 'Teile z-sortiert');
    }
  });

  test(`${region}: deterministisch, unabhängig von der Eingabereihenfolge`, () => {
    const a = buildScene(R, mk(80)), b = buildScene(R, [...mk(80)].reverse());
    assert.deepEqual([...pos(a)].sort(), [...pos(b)].sort());
    assert.equal(a.W, b.W); assert.equal(a.H, b.H);
    const key = (p) => `${p.kind}|${p.prop}|${p.v}|${p.x}|${p.y}|${p.z}|${p.flip}`;
    assert.deepEqual(a.pieces.map(key), b.pieces.map(key));
  });

  test(`${region}: Wachstum – Pflanzen ziehen nie um, Abschnitte bleiben gleich`, () => {
    const all = mk(420);
    let prev = buildScene(R, all.slice(0, 1));
    let grew = 0;
    for (const n of [2, 5, 9, 14, 18, 19, 20, 21, 40, 61, 62, 120, 250, 420]) {
      const cur = buildScene(R, all.slice(0, n));
      if (cur.sections.length > prev.sections.length) grew++;
      assert.ok(cur.sections.length >= prev.sections.length, 'schrumpft nicht');
      const p = pos(prev), c = pos(cur);
      for (const [id, v] of p) assert.equal(c.get(id), v, `${id} ist umgezogen (n=${n})`);
      prev.sections.forEach((s, i) => {
        const t = cur.sections[i];
        assert.deepEqual([t.rect.x - cur.ox, t.rect.y - cur.oy, t.rect.w, t.rect.h], [s.rect.x - prev.ox, s.rect.y - prev.oy, s.rect.w, s.rect.h], `Abschnitt ${i} verändert`);
        assert.deepEqual(t.spots.map((q) => [q.key, q.x - cur.ox, q.y - cur.oy]), s.spots.map((q) => [q.key, q.x - prev.ox, q.y - prev.oy]));
      });
      prev = cur;
    }
    assert.ok(grew >= 3, 'Region ist mitgewachsen');
  });

  test(`${region}: neuer Abschnitt erst, wenn alle Spots belegt sind`, () => {
    const cap = buildScene(R, mk(1)).capacity;
    const full = buildScene(R, mk(cap)), more = buildScene(R, mk(cap + 1));
    assert.equal(full.capacity, cap);
    assert.equal(full.free.length, 0);
    assert.ok(more.sections.length > full.sections.length);
  });

  test(`${region}: Plätze zufällig verteilt, nicht der Reihe nach`, () => {
    const sc = buildScene(R, mk(10));
    const order = [...sc.items].sort((a, b) => a.plant.createdAt - b.plant.createdAt).map((i) => i.spot.key);
    const seq = [...order].sort((a, b) => a.split('.').map(Number)[0] - b.split('.').map(Number)[0] || a.split('.').map(Number)[1] - b.split('.').map(Number)[1]);
    assert.notDeepEqual(order, seq);
  });

  test(`${region}: Tippen auf den Fuß einer Pflanze trifft genau diese (auch bei voller Belegung)`, () => {
    for (const n of [12, 80, 300]) {
      const sc = buildScene(R, mk(n));
      for (const it of sc.items) {
        assert.equal(hitTest(sc.items, it.x, it.y - 2), it, `${region} n=${n}: ${it.spot.key} (${it.x},${it.y}) verdeckt`);
      }
      // Fußpunkte liegen nie aufeinander
      for (let i = 0; i < sc.items.length; i++) for (let j = i + 1; j < sc.items.length; j++) {
        const a = sc.items[i], b = sc.items[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 10, `${a.spot.key}/${b.spot.key} zu nah`);
      }
    }
  });

  test(`${region}: Auffüllen hängt leere Abschnitte an, belegt sie aber nie`, () => {
    const base = buildScene(R, mk(20));
    const big = buildScene(R, mk(20), { W: base.W * 2, H: base.H * 2 });
    assert.ok(big.W >= base.W * 2 && big.H >= base.H * 2);
    for (const s of big.sections.slice(base.sections.length)) {
      assert.ok(s.fill);
      for (const p of s.spots) assert.equal(p.plant, null);
    }
  });

  test(`${region}: Deko verdeckt keine Pflanzen und weicht belegten Spots`, () => {
    for (const n of [0, 8, 60, 200]) {
      const sc = buildScene(R, mk(n));
      const taken = new Set(sc.items.map((i) => i.spot.key));
      for (const p of [...sc.pieces, ...sc.front]) {
        if (p.spot) assert.ok(!taken.has(p.spot), `${p.kind || p.prop} auf belegtem Spot ${p.spot}`);
        if (p.yield) assert.ok(!sc.items.some((it) => overlaps(plantBox(it), p.box)), `${p.kind || p.prop} verdeckt Pflanze`);
      }
      if (n === 0) assert.ok(sc.pieces.length >= 8, `${region}: zu wenig Deko ohne Pflanzen`);
    }
    // neue Pflanze nimmt höchstens Deko weg, verschiebt nichts (gleiche Größe)
    const a = buildScene(R, mk(8)), b = buildScene(R, mk(9));
    if (a.W === b.W && a.H === b.H && a.sections.length === b.sections.length) {
      const key = (p) => `${p.kind}|${p.prop}|${p.v}|${p.x}|${p.y}`;
      const s = new Set(a.pieces.map(key));
      const added = b.pieces.filter((p) => !s.has(key(p)) && p.kind !== 'hanger');
      assert.equal(added.length, 0, `${region}: ${added.map(key)}`);
    }
  });
}

// --- Rendern mit Canvas-Attrappe -------------------------------------------------

function fakeCanvas(w = 1, h = 1) {
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createImageData') return (W, H) => ({ data: new Uint8ClampedArray(W * H * 4), width: W, height: H });
      if (k === 'getImageData') return (x, y, W, H) => ({ data: new Uint8ClampedArray(W * H * 4) });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (k === 'drawImage') return (img) => { if (!img || typeof img !== 'object') throw new Error('drawImage ohne Bild'); };
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => ctx };
}

test('alle Regionen: Hintergrund und alle Teile rendern ohne Fehler', async () => {
  globalThis.document ||= { createElement: () => fakeCanvas() };
  const { pieceSprite } = await import('../js/garden.js');
  for (const region of REGIONS) {
    const R = SCENES[region];
    for (const n of [0, 8, 60, 300]) {
      const base = buildScene(R, mk(n));
      for (const sc of [base, buildScene(R, mk(n), { W: base.W + 37, H: base.H * 1.5 })]) {
        const bg = R.paint(sc);
        assert.ok(bg.canvas && bg.glow, `${region} paint`);
        for (const h of bg.halos || []) assert.ok(Number.isFinite(h.x) && Number.isFinite(h.y) && h.r > 0);
        for (const p of [...sc.pieces, ...sc.front]) {
          const sp = pieceSprite(R, p);
          assert.ok(sp && sp.img && Number.isFinite(sp.ax) && Number.isFinite(sp.ay), `${region}: Teil ${p.kind || p.prop} ohne Sprite`);
        }
      }
    }
  }
});

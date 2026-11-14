import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutGarden, worldSize, minDistance, hashString, rngFor, furnitureLayout, INDOOR } from '../js/layout.js';

const mk = (n, prefix = 'p') => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, createdAt: 1000 + i }));

test('deterministisch: gleiche Pflanzen → gleiche Positionen', () => {
  const a = layoutGarden(mk(40), 'blumenwiese');
  const b = layoutGarden([...mk(40)].reverse(), 'blumenwiese');
  assert.deepEqual(a.items.map((i) => [i.plant.id, i.x, i.y, i.flip]), b.items.map((i) => [i.plant.id, i.x, i.y, i.flip]));
});

test('keine Klumpen: Mindestabstand eingehalten', () => {
  for (const n of [5, 30, 120]) {
    const l = layoutGarden(mk(n), 'wald');
    assert.ok(minDistance(l.items) >= 12, `n=${n}: ${minDistance(l.items)}`);
  }
});

test('Y-Sortierung (frei) bzw. z-Sortierung (Innenräume) und innerhalb der Fläche', () => {
  for (const region of ['blumenwiese', 'wald', 'pflanzenhandlung', 'gewaechshaus']) {
    const l = layoutGarden(mk(60), region);
    const key = INDOOR[region] ? 'z' : 'y';
    for (let i = 1; i < l.items.length; i++) assert.ok(l.items[i][key] >= l.items[i - 1][key], region);
    for (const it of l.items) {
      assert.ok(it.x >= 0 && it.x <= l.W && it.y >= 0 && it.y <= l.H, `${region}: ${it.x},${it.y}`);
      // Innenräume: Sprite (32 px hoch) passt ganz in die Welt
      if (INDOOR[region]) assert.ok(it.y - 31 >= 0 && it.x - 16 >= 0 && it.x + 16 <= l.W, `${region} Sprite: ${it.x},${it.y}`);
    }
    for (let i = 1; i < l.pieces.length; i++) assert.ok(l.pieces[i].z >= l.pieces[i - 1].z);
  }
});

test('Fläche wächst mit der Anzahl', () => {
  const s1 = worldSize(1, 'blumenwiese'), s50 = worldSize(50, 'blumenwiese'), s500 = worldSize(500, 'blumenwiese');
  assert.ok(s1.W < s50.W && s50.W < s500.W);
});

test('neue Pflanze verschiebt ältere nicht (gleiche Größenstufe)', () => {
  const plants = mk(10);
  const a = layoutGarden(plants, 'blumenwiese');
  const b = layoutGarden([...plants, { id: 'neu', createdAt: 99999 }], 'blumenwiese');
  if (a.W === b.W) {
    for (const it of a.items) {
      const o = b.items.find((x) => x.plant.id === it.plant.id);
      assert.equal(o.x, it.x); assert.equal(o.y, it.y);
    }
  }
});

test('Hash/RNG stabil', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
  const r = rngFor('x');
  const v = r();
  assert.ok(v >= 0 && v < 1);
  assert.equal(rngFor('x')(), v);
});

// --- Innenräume: Möbel und Beete -------------------------------------------

for (const region of ['pflanzenhandlung', 'gewaechshaus']) {
  test(`${region}: jede Pflanze hat einen eigenen Stellplatz`, () => {
    for (const n of [1, 10, 60, 300]) {
      const l = layoutGarden(mk(n), region);
      assert.equal(l.items.length, n);
      assert.equal(new Set(l.items.map((i) => i.slot)).size, n, `n=${n}`);
      assert.ok(l.capacity >= n);
      assert.ok(l.pieces.length > 0);
    }
  });

  test(`${region}: deterministisch, unabhängig von der Eingabereihenfolge`, () => {
    const a = layoutGarden(mk(80), region);
    const b = layoutGarden([...mk(80)].reverse(), region);
    const f = (l) => l.items.map((i) => [i.plant.id, i.x, i.y, i.flip, i.slot]).sort();
    assert.deepEqual(f(a), f(b));
    assert.equal(a.W, b.W);
    assert.equal(a.H, b.H);
  });

  test(`${region}: Wachstum lässt bestehende Pflanzen stehen (auch über Größenstufen)`, () => {
    const all = mk(400);
    const pos = (l) => new Map(l.items.map((i) => [i.plant.id, `${i.x},${i.y},${i.slot},${i.flip}`]));
    let prev = layoutGarden(all.slice(0, 1), region);
    let grew = 0;
    for (const n of [5, 18, 19, 20, 21, 40, 61, 120, 250, 400]) {
      const cur = layoutGarden(all.slice(0, n), region);
      if (cur.W !== prev.W || cur.H !== prev.H) grew++;
      assert.ok(cur.W >= prev.W && cur.H >= prev.H, 'Raum schrumpft nicht');
      const p = pos(prev), c = pos(cur);
      for (const [id, v] of p) assert.equal(c.get(id), v, `${id} ist umgezogen (n=${n})`);
      // Möbel bleiben an ihrem Platz
      const key = (q) => `${q.kind}|${q.part}|${q.x}|${q.y}`;
      const pieces = new Set(cur.pieces.map(key));
      for (const q of prev.pieces) assert.ok(pieces.has(key(q)), `Möbel ${key(q)} fehlt`);
      prev = cur;
    }
    assert.ok(grew >= 3, 'Raum ist mitgewachsen');
  });

  test(`${region}: Raum wächst erst, wenn alle Plätze belegt sind`, () => {
    const cap = layoutGarden(mk(1), region).capacity;
    const full = layoutGarden(mk(cap), region);
    const more = layoutGarden(mk(cap + 1), region);
    assert.equal(full.capacity, cap);
    assert.equal(full.W * full.H, layoutGarden(mk(1), region).W * layoutGarden(mk(1), region).H);
    assert.ok(more.W * more.H > full.W * full.H);
    assert.ok(more.capacity > cap);
  });

  test(`${region}: Plätze werden zufällig gewählt, nicht der Reihe nach`, () => {
    const l = layoutGarden(mk(12), region);
    const order = [...l.items].sort((a, b) => a.plant.createdAt - b.plant.createdAt).map((i) => i.slot);
    const seq = l.items.map((i) => i.slot).sort((a, b) => {
      const pa = a.split(',').map(Number), pb = b.split(',').map(Number);
      return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
    });
    assert.notDeepEqual(order, seq);
    // mehr als ein Möbelstück/Beet wird benutzt
    assert.ok(new Set(order.map((s) => s.split(',').slice(0, 2).join())).size >= 3);
  });
}

test('Pflanzenhandlung: Regalpflanzen liegen zwischen ihren Regalböden in der Zeichenreihenfolge', () => {
  const l = furnitureLayout(mk(20), 'pflanzenhandlung');
  const shelf = l.pieces.filter((p) => p.kind === 'shelf');
  const back = shelf.find((p) => p.part === 'back');
  const b1 = shelf.find((p) => p.part === 'board1' && p.x === back.x);
  const b2 = shelf.find((p) => p.part === 'board2' && p.x === back.x);
  assert.ok(back.z < b1.z && b1.z < b2.z);
  const onShelf = l.items.filter((i) => Math.abs(i.x - back.x) <= 18 && i.y < back.y);
  for (const it of onShelf) {
    assert.ok(it.z > back.z);
    if (it.y > 90) assert.ok(it.z < b1.z, 'unterer Boden vor dem mittleren Brett');
    else if (it.y > 60) assert.ok(it.z > b1.z && it.z < b2.z);
    else assert.ok(it.z > b2.z);
  }
});

test('Gewächshaus: Pflanzen stehen innerhalb der Beete', () => {
  const l = furnitureLayout(mk(120), 'gewaechshaus');
  const beds = l.pieces.filter((p) => p.kind === 'bed');
  for (const it of l.items) {
    const bed = beds.find((b) => it.x >= b.x + 3 && it.x <= b.x + 60 && it.y >= b.y + 8 && it.y <= b.y + 25);
    assert.ok(bed, `${it.x},${it.y} liegt in keinem Beet`);
    assert.ok(it.z > bed.z);
  }
});

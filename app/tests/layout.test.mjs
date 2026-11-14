import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutGarden, worldSize, minDistance, hashString, rngFor } from '../js/layout.js';

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

test('Y-Sortierung und innerhalb der Fläche', () => {
  const l = layoutGarden(mk(60), 'pflanzenhandlung');
  for (let i = 1; i < l.items.length; i++) assert.ok(l.items[i].y >= l.items[i - 1].y);
  for (const it of l.items) {
    assert.ok(it.x >= 0 && it.x <= l.W && it.y >= 0 && it.y <= l.H);
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

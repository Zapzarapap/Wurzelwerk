import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutGarden } from '../js/layout.js';
import { decorPieces, blocksPlant, tileDecor } from '../js/decor.js';

const mk = (n, prefix = 'p') => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, createdAt: 1000 + i }));
const deco = (n, region) => {
  const l = layoutGarden(mk(n), region);
  return { l, d: decorPieces(l) };
};
const key = (p) => `${p.kind}|${p.part}|${p.v}|${p.x}|${p.y}|${p.flip}`;
const REGIONS = ['pflanzenhandlung', 'gewaechshaus', 'blumenwiese', 'wald'];

test('Deko: deterministisch und auch ohne Pflanzen vorhanden', () => {
  for (const r of REGIONS) {
    const a = deco(8, r).d.map(key), b = deco(8, r).d.map(key);
    assert.deepEqual(a, b, r);
    assert.ok(deco(0, r).d.length >= 8, `${r}: zu wenig Deko ohne Pflanzen`);
  }
});

test('Deko: Innenräume belegen keinen Stellplatz einer Pflanze', () => {
  for (const r of ['pflanzenhandlung', 'gewaechshaus'])
    for (const n of [0, 8, 60, 200]) {
      const { l, d } = deco(n, r);
      for (const it of l.items)
        for (const p of d) assert.ok(!(Math.abs(p.x - it.x) < 6 && Math.abs(p.y - it.y) < 3), `${r} n=${n}: ${p.part} auf Pflanze ${it.x},${it.y}`);
    }
});

test('Deko: Innenraum-Deko auf Stellplätzen macht neuen Pflanzen Platz, sonst bleibt alles stehen', () => {
  for (const r of ['pflanzenhandlung', 'gewaechshaus']) {
    const a = new Set(deco(10, r).d.map(key)), b = deco(11, r).d.map(key);
    for (const k of b) assert.ok(a.has(k), `${r}: ${k} ist neu/umgezogen`);
    assert.ok(a.size - b.length <= 3, `${r}: zu viel verschwunden`);
  }
});

test('Deko: Wiese und Wald verdecken keine Pflanzen und bleiben beim Wachsen stehen', () => {
  for (const r of ['blumenwiese', 'wald']) {
    for (const n of [0, 8, 60, 200]) {
      const { l, d } = deco(n, r);
      for (const p of d) if (p.part !== 'squirrel') assert.ok(!blocksPlant(p.part, p.x, p.y, l.items), `${r} n=${n}`);
      for (const p of d) assert.ok(p.x > 0 && p.x < l.W && p.y > 0 && p.y < l.H, `${r}: außerhalb`);
    }
    // gleiche Weltgröße: neue Pflanze nimmt höchstens Deko weg, verschiebt nichts
    const a = deco(8, r), b = deco(9, r);
    if (a.l.W === b.l.W) {
      const s = new Set(a.d.map(key));
      for (const p of b.d) assert.ok(s.has(key(p)), `${r}: ${key(p)}`);
    }
    assert.deepEqual(tileDecor(r, 3, 4), tileDecor(r, 3, 4));
  }
});

test('Deko: Kieswege im Gewächshaus liegen nicht in den Beeten', () => {
  const { l, d } = deco(60, 'gewaechshaus');
  const beds = l.pieces.filter((p) => p.kind === 'bed');
  for (const p of d.filter((q) => ['barrow', 'sack', 'hose', 'straw'].includes(q.part) && q.y > 46))
    for (const b of beds) assert.ok(!(p.x > b.x + 3 && p.x < b.x + 60 && p.y > b.y + 6 && p.y < b.y + 31), `${p.part} ${p.x},${p.y} im Beet`);
});

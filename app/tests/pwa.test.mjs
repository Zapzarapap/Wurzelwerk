import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(APP, 'sw.js'), 'utf8');

function walk(dir, base = '') {
  return readdirSync(join(APP, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name), base) : [join(dir, e.name)]);
}

test('Service Worker cached alle JS-Module', () => {
  for (const f of walk('js')) assert.ok(sw.includes(`'${f}'`), `${f} fehlt in sw.js SHELL`);
});

test('SHELL-Dateien existieren', () => {
  const list = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]).filter((f) => f !== './');
  assert.ok(list.length > 10);
  for (const f of list) assert.ok(existsSync(join(APP, f)), `${f} existiert nicht`);
});

test('SW-Version passt zu js/version.js', () => {
  const v1 = /const VERSION = '([^']+)'/.exec(sw)[1];
  const v2 = /APP_VERSION = '([^']+)'/.exec(readFileSync(join(APP, 'js/version.js'), 'utf8'))[1];
  assert.equal(v1, v2);
});

test('Pflanzenkatalog: 72 Arten, IDs eindeutig, Preise gesetzt', async () => {
  const { PLANTS, REGIONS } = await import('../js/plants.js');
  const { CONFIG } = await import('../js/config.js');
  assert.equal(PLANTS.length, 72);
  assert.equal(new Set(PLANTS.map((p) => p.id)).size, 72);
  assert.deepEqual(REGIONS.map((r) => r.id), ['pflanzenhandlung', 'gewaechshaus', 'blumenwiese', 'wald']);
  for (const p of PLANTS) assert.ok(p.id in CONFIG.plantPrices, p.id);
  const m = JSON.parse(readFileSync(join(APP, 'data/sprites.json'), 'utf8'));
  for (const [id, s] of Object.entries(m.species)) {
    const p = PLANTS.find((x) => x.id === id);
    if (p) assert.equal(p.region, s.region, `Region von ${id}`);
  }
});

// Tests für v0.5.3: Trennstellen langer Namen, Shop-Vorschau (reine Logik), gleichmäßige
// Auswahl-Ränder, Modus-Karten. Die Überlauf-Prüfung im Browser: tools/check_overflow.py.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(APP, f), 'utf8');
const { PLANTS, REGIONS, BREAKS, hyphenate, VARIANT_LABELS } = await import('../js/plants.js');
const { stageMinutes, studyMinutes, studyText, buyState, variantSwatch, stripScale } = await import('../js/preview.js');
const SHY = '­';

test('label = name mit weichen Trennstellen, sonst identisch', () => {
  for (const p of PLANTS) assert.equal(p.label.replaceAll(SHY, ''), p.name, p.id);
  for (const r of REGIONS) assert.equal(r.label.replaceAll(SHY, ''), r.name, r.id);
  assert.equal(hyphenate('Zunderschwamm'), `Zunder${SHY}schwamm`);
  assert.equal(hyphenate('Moospolster mit Glühpilzen'), `Moos${SHY}polster mit Glüh${SHY}pilzen`);
});

test('jedes Wort ab 9 Buchstaben hat mindestens eine Trennstelle', () => {
  const missing = PLANTS.flatMap((p) => p.label.split(' ')).filter((w) => w.length >= 9 && !w.includes(SHY));
  assert.deepEqual([...new Set(missing)], []);
});

test('jede Trennregel passt auf ein Wort im Katalog (keine Tippfehler)', () => {
  const words = new Set(PLANTS.flatMap((p) => p.name.split(' ')));
  for (const b of BREAKS) assert.ok(words.has(b.replaceAll('|', '')), b);
});

test('Vorschau: 5 Stufen mit 15/30/60/90/120 min', () => {
  assert.deepEqual(stageMinutes(), [
    { stage: 1, minutes: 15 }, { stage: 2, minutes: 30 }, { stage: 3, minutes: 60 }, { stage: 4, minutes: 90 }, { stage: 5, minutes: 120 },
  ]);
});

test('Vorschau: Lernzeit zum Preis', () => {
  assert.equal(studyMinutes(150), 150);
  assert.equal(studyMinutes(-5), 0);
  assert.equal(studyText(150), '2 h 30 min');
  assert.equal(studyText(45), '45 min');
});

test('Vorschau: Kauf-Button-Zustände', () => {
  const base = { price: 150, region: 'wald', regionName: 'Wald', regionPrice: 300 };
  assert.equal(buyState({ ...base, have: true, regionUnlocked: true, balance: 0 }).kind, 'owned');
  const r = buyState({ ...base, have: false, regionUnlocked: false, balance: 9999 });
  assert.equal(r.kind, 'region');
  assert.equal(r.enabled, false);
  assert.equal(r.label, 'Erst Wald freischalten');
  assert.match(r.hint, /im Wald/);
  assert.match(r.hint, /300 Tokens/);
  const t = buyState({ ...base, have: false, regionUnlocked: true, balance: 100 });
  assert.equal(t.kind, 'tokens');
  assert.equal(t.enabled, false);
  assert.match(t.hint, /50 Tokens/);
  assert.match(t.hint, /50 min/);
  const b = buyState({ ...base, have: false, regionUnlocked: true, balance: 150 });
  assert.equal(b.kind, 'buy');
  assert.equal(b.enabled, true);
  assert.match(b.hint, /0 Tokens/);
  // Startpflanze in noch gesperrter Region (inklusive): erklärt, dass der Ort fehlt
  assert.equal(buyState({ ...base, have: true, regionUnlocked: false, balance: 0 }).kind, 'region');
});

test('Vorschau: jede Variante hat ein eigenes Farbfeld', () => {
  for (const v of new Set(PLANTS.flatMap((p) => p.variants))) {
    assert.ok(v in VARIANT_LABELS, v);
    assert.match(variantSwatch(v), /^#[0-9a-f]{6}$/, v);
    assert.notEqual(variantSwatch(v), '#9a8a78', `${v} nutzt den Ersatzton`);
  }
});

test('Vorschau: Stufen-Streifen nur ganzzahlig skaliert und passt in die Breite', () => {
  for (const vw of [320, 375, 390, 430, 520]) {
    const inner = Math.min(vw, 520) - 40;
    const sc = stripScale(inner);
    assert.ok(sc === 1 || sc === 2);
    assert.ok(5 * 32 * sc + 4 + 4 <= inner, `${vw}px: ${sc}×`);
  }
  assert.equal(stripScale(335), 2); // iPhone SE / 8
  assert.equal(stripScale(280), 1);
});

test('Auswahl-Zustände: gleichmäßiger Rand, kein dickerer Rand unten', () => {
  const css = read('css/style.css');
  for (const sel of ['.chip.on', '.plant-pick.on', '.segmented button.on', '.region-tabs button.on', '.mode-card.on', '.pv-stage.on']) {
    const rules = [...css.matchAll(new RegExp(sel.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}', 'g'))].map((m) => m[1]);
    assert.ok(rules.length, `${sel} fehlt`);
    for (const r of rules) assert.doesNotMatch(r, /box-shadow:\s*0 \d+px 0/, `${sel}: Schatten nur nach unten`);
  }
  assert.doesNotMatch(/\.tokens\s*\{[^}]*\}/.exec(css)[0], /box-shadow/);
});

test('Modus: zwei eigenständige Karten mit Pixel-Icons statt Segmented Control', () => {
  const learn = read('js/views/learn.js');
  assert.doesNotMatch(learn, /segmented\(/);
  assert.match(learn, /modeCard\('timer', 'Timer'/);
  assert.match(learn, /modeCard\('endless', 'Endless'/);
  const ui = read('js/ui.js');
  assert.match(ui, /infinity: \[/);
  assert.match(read('css/style.css'), /\.mode-cards \{[^}]*grid-template-columns: 1fr 1fr; gap: 10px/);
});

test('Lange Namen: keine Ellipse mehr bei Tag- und Pflanzennamen', () => {
  const css = read('css/style.css');
  for (const sel of ['.chip-label', '.tag-row-head .name', '.tag-item .tag-name', '.tag-pill .tname']) {
    const m = new RegExp(sel.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}').exec(css);
    assert.ok(m, sel);
    assert.doesNotMatch(m[1], /ellipsis|nowrap/, sel);
  }
  assert.match(css, /\.pname \{[^}]*hyphens: manual/);
  assert.match(css, /\.tname \{[^}]*overflow-wrap: anywhere/);
  assert.doesNotMatch(read('js/views/stats.js'), /'ellipsis' }, store\.tagName/);
});

test('Shop: Kachel öffnet Vorschau, Preis-Button kauft weiter direkt', () => {
  const shop = read('js/views/shop.js');
  assert.match(shop, /onclick: \(\) => openPlantPreview\(p\.id\)/);
  assert.match(shop, /e\.stopPropagation\(\); buy\('plant'/);
  assert.match(read('css/style.css'), /\.shop-item \.btn\.price:disabled \{ pointer-events: none; \}/);
});

test('Version 0.5.x, neue Module im SW-Cache', () => {
  const sw = read('sw.js');
  assert.match(sw, /const VERSION = '0\.5\.\d+'/);
  assert.match(read('js/version.js'), /APP_VERSION = '0\.5\.\d+'/);
  for (const f of ['js/preview.js', 'js/views/plantpreview.js']) assert.ok(sw.includes(`'${f}'`), f);
});

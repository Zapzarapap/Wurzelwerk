// Tests für v0.5.5: Orte mit fester Ansicht (kein Pan/Zoom), Konstante CONFIG.garden.ortZoomEnabled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(APP, f), 'utf8');

function fakeCanvas(w = 390, h = 600) {
  const handlers = {};
  return {
    width: w, height: h, handlers,
    getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }),
    getBoundingClientRect() { return { left: 0, top: 0, width: this.cssW ?? this.width, height: this.cssH ?? this.height }; },
    addEventListener(t, f) { (handlers[t] ||= []).push(f); },
    setPointerCapture() {},
    fire(t, e) { for (const f of handlers[t] || []) f({ preventDefault() {}, ...e }); },
  };
}
globalThis.window = { devicePixelRatio: 1 };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.cancelAnimationFrame = () => {};
globalThis.performance ??= { now: () => 0 };

const { CONFIG } = await import('../js/config.js');
const { GardenRenderer } = await import('../js/garden.js');

test('Zoom ist standardmäßig aus', () => {
  assert.equal(CONFIG.garden.ortZoomEnabled, false);
});

test('feste Ansicht: keine Pan-/Pinch-/Rad-/Doppeltipp-Handler, Zoom-Aufrufe wirkungslos', () => {
  const cv = fakeCanvas();
  const r = new GardenRenderer(cv, {});
  assert.equal(r.zoomEnabled, false);
  assert.equal(cv.handlers.wheel, undefined);
  assert.equal(cv.handlers.dblclick, undefined);
  r.scene = { W: 100, H: 100, scale: 3 };
  r.fit();
  const cam = { ...r.cam };
  r.zoomBy(1.5);
  r.zoomAt(9, 10, 10);
  assert.deepEqual(r.cam, cam);
});

test('feste Ansicht: Ziehen ändert die Kamera nicht und ist kein Tippen; Tippen ruft onTap', () => {
  const cv = fakeCanvas();
  let taps = 0;
  const r = new GardenRenderer(cv, { onTap: () => taps++ });
  r.scene = { W: 100, H: 100, scale: 3, items: [] };
  r.fit();
  const cam = { ...r.cam };
  cv.fire('pointerdown', { pointerId: 1, clientX: 50, clientY: 50 });
  cv.fire('pointermove', { pointerId: 1, clientX: 120, clientY: 160 });
  cv.fire('pointerup', { pointerId: 1, type: 'pointerup', clientX: 120, clientY: 160 });
  assert.deepEqual(r.cam, cam);
  assert.equal(taps, 0);
  // Zwei Finger (Pinch) zählen nicht als Tippen
  cv.fire('pointerdown', { pointerId: 1, clientX: 50, clientY: 50 });
  cv.fire('pointerdown', { pointerId: 2, clientX: 90, clientY: 50 });
  cv.fire('pointerup', { pointerId: 2, type: 'pointerup', clientX: 90, clientY: 50 });
  cv.fire('pointerup', { pointerId: 1, type: 'pointerup', clientX: 50, clientY: 50 });
  assert.equal(taps, 0);
  cv.fire('pointerdown', { pointerId: 1, clientX: 50, clientY: 50 });
  cv.fire('pointerup', { pointerId: 1, type: 'pointerup', clientX: 51, clientY: 50 });
  assert.equal(taps, 1);
});

test('Resize passt den ganzen Ort wieder ein, auch nach userMoved', () => {
  const cv = fakeCanvas(390, 600);
  const r = new GardenRenderer(cv, {});
  r.scene = { W: 100, H: 100, scale: 3 };
  r.userMoved = true;
  r.cam = { s: 9, ox: -500, oy: -500 };
  cv.cssW = 300; cv.cssH = 300;
  r.resize();
  assert.equal(r.userMoved, false);
  assert.equal(r.cam.s, 3);
  assert.equal(r.cam.ox, Math.round((300 - 300) / 2));
});

test('Ansicht: Zoom-Leiste nur hinter der Konstante, Fläche touch-action: none', () => {
  const view = read('js/views/garden.js');
  assert.match(view, /CONFIG\.garden\.ortZoomEnabled/);
  const css = read('css/style.css');
  assert.match(css, /\.garden-canvas \{[^}]*touch-action: none/);
});

test('Version 0.5.5 in sw.js und version.js', () => {
  assert.match(read('js/version.js'), /'0\.5\.5'/);
  assert.match(read('sw.js'), /VERSION = '0\.5\.5'/);
});

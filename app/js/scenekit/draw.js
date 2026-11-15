// Gemeinsame Zeichenhelfer für Szenen (Hintergründe und Teile).
//
// - C: alle Rampen aus palette.js als RGB-Arrays ([outline, shade, base, light, highlight]).
// - Buf: schneller Pixelpuffer (ImageData) für große Flächen (Wände, Böden, Wiese),
//   mit eigener Leucht-Ebene und einer Warteschlange für PixelArt-Teile.
// - Formen für PixelArt-Ebenen: slab (Brett in 3/4-Ansicht), post, trap, text.
// - sprite(key, build): Cache für fertige Teile.
// Nichts hier zeichnet beim Import – die Module laufen auch in Node (Tests).
import { RAMPS, hexToRgb } from '../palette.js';
import { PixelArt, makeCanvas, OUTLINE, SHADE, BASE, LIGHT, HIGH } from '../pixelart.js';
import { noise } from './rng.js';

export { PixelArt, makeCanvas, OUTLINE, SHADE, BASE, LIGHT, HIGH, RAMPS };

/** Rampen als RGB: C.wood[BASE] → [134, 88, 58] */
export const C = Object.fromEntries(Object.entries(RAMPS).map(([k, v]) => [k, v.map(hexToRgb)]));

/** Eigene Rampe (5 Hex-Farben) → RGB-Array, z. B. für lokale Regionsfarben. */
export const rgbRamp = (hexes) => hexes.map(hexToRgb);

/** Mischung zweier RGB-Farben (t = 0..1). */
export const mix = (a, b, t) => (a.length === 3
  ? [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]
  : a.map((v, i) => Math.round(v + (b[i] - v) * t)));

/**
 * Pixelpuffer für Hintergründe. Pixel ohne set() bleiben durchsichtig – dort
 * scheint der Himmel durch (Fenster, Glasdach), wenn paint() sky: true meldet.
 */
export class Buf {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.d = new Uint8ClampedArray(W * H * 4);
    this.gd = null; // Leucht-Ebene (lazy)
    this.queue = []; // [art, x, y] – nach dem Füllen gezeichnet
  }
  set(x, y, rgb, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const i = (y * this.W + x) * 4, d = this.d;
    if (a >= 255) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; return; }
    // einfache Überblendung über vorhandene Pixel
    const k = a / 255, old = d[i + 3] / 255, out = k + old * (1 - k);
    if (out <= 0) return;
    for (let c = 0; c < 3; c++) d[i + c] = Math.round((rgb[c] * k + d[i + c] * old * (1 - k)) / out);
    d[i + 3] = Math.round(out * 255);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return null;
    const i = (y * this.W + x) * 4;
    return this.d[i + 3] ? [this.d[i], this.d[i + 1], this.d[i + 2]] : null;
  }
  /** Pixel durchsichtig machen (Loch für den Himmel). */
  clear(x, y, w = 1, h = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue;
      this.d[(j * this.W + i) * 4 + 3] = 0;
    }
  }
  rect(x, y, w, h, rgb, a = 255) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, rgb, a);
  }
  hline(x0, x1, y, rgb) { for (let x = x0; x <= x1; x++) this.set(x, y, rgb); }
  vline(x, y0, y1, rgb) { for (let y = y0; y <= y1; y++) this.set(x, y, rgb); }
  /** Gefüllte Ellipse (Pixelraster). */
  ellipse(cx, cy, rx, ry, rgb, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / Math.max(rx, 0.5), dy = (y + 0.5 - cy) / Math.max(ry, 0.5);
        if (dx * dx + dy * dy <= 1) this.set(x, y, rgb, a);
      }
  }
  line(x0, y0, x1, y1, rgb) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), rgb);
  }
  /** Fläche mit Rauschen aus einer Rampe: tones = [[schwelle, ton], ...] aufsteigend. */
  noisy(x, y, w, h, ramp, tones, seed = 0, sx = 1, sy = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const n = noise(Math.floor(i / sx), Math.floor(j / sy), seed);
      let t = tones[tones.length - 1][1];
      for (const [th, tone] of tones) if (n < th) { t = tone; break; }
      this.set(i, j, ramp[t]);
    }
  }
  /** Leuchtendes Pixel (bleibt nachts hell). Zeichnet es auch normal. */
  glow(x, y, rgb, alsoBase = true) {
    if (alsoBase) this.set(x, y, rgb);
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    this.gd ||= new Uint8ClampedArray(this.W * this.H * 4);
    const i = (y * this.W + x) * 4;
    this.gd[i] = rgb[0]; this.gd[i + 1] = rgb[1]; this.gd[i + 2] = rgb[2]; this.gd[i + 3] = 255;
  }
  /** PixelArt (oder fertiges Sprite {img, glow, ax, ay}) an x, y einplanen. */
  art(art, x, y, flip = false) {
    this.queue.push([art, x, y, flip]);
  }
  /** → { canvas, glow } (Browser). */
  finish() {
    const c = makeCanvas(this.W, this.H), ctx = c.getContext('2d');
    const img = ctx.createImageData(this.W, this.H);
    img.data.set(this.d);
    ctx.putImageData(img, 0, 0);
    const g = makeCanvas(this.W, this.H), gctx = g.getContext('2d');
    if (this.gd) {
      const gi = gctx.createImageData(this.W, this.H);
      gi.data.set(this.gd);
      gctx.putImageData(gi, 0, 0);
    }
    for (const [art, x, y, flip] of this.queue) {
      if (art instanceof PixelArt) art.drawTo(ctx, x, y, gctx);
      else if (art?.img) {
        drawSprite(ctx, art.img, art, x, y, flip);
        if (art.glow) drawSprite(gctx, art.glow, art, x, y, flip);
      }
    }
    return { canvas: c, glow: g };
  }
}

/** Sprite {ax, ay} an Fußpunkt x, y zeichnen (optional gespiegelt um den Anker). */
export function drawSprite(ctx, img, sp, x, y, flip = false) {
  const top = y - sp.ay;
  if (flip) {
    ctx.save();
    ctx.translate(x + sp.ax + 1, top);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  } else ctx.drawImage(img, x - sp.ax, top);
}

// --- Formen für PixelArt-Ebenen ------------------------------------------------

/** Brett/Platte in 3/4-Ansicht: Oberfläche (s-2..s), Vorderkante (s+1..s+front). */
export function slab(l, x0, x1, s, front = 2) {
  for (let x = x0; x <= x1; x++) {
    l.set(x, s - 2, BASE);
    l.set(x, s - 1, LIGHT);
    l.set(x, s, LIGHT);
    l.set(x, s + 1, HIGH);
    for (let k = 2; k <= front; k++) l.set(x, s + k, k === front ? SHADE : BASE);
  }
  l.set(x0, s + 2, BASE).set(x1, s + 1, LIGHT);
}

/** Senkrechter Pfosten, 3 px: links hell, rechts dunkel. */
export function post(l, x, y0, y1) {
  for (let y = y0; y <= y1; y++) l.set(x, y, LIGHT).set(x + 1, y, BASE).set(x + 2, y, SHADE);
}

/** Trapez (Töpfe, Wannen): Breite w0 oben → w1 unten. */
export function trap(l, cx, y0, y1, w0, w1, tone = null) {
  for (let y = y0; y <= y1; y++) {
    const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    const hw = (w0 + (w1 - w0) * t) / 2;
    for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) l.set(x, y, tone);
  }
}

// 3×5-Pixelschrift (Großbuchstaben, Ziffern)
const FONT = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  K: ['101', '110', '100', '110', '101'], L: ['100', '100', '100', '100', '111'], M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['1001', '1101', '1011', '1001', '1001'], O: ['111', '101', '101', '101', '111'], P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'], W: ['10001', '10001', '10101', '10101', '01010'], Z: ['111', '001', '010', '100', '111'],
  ' ': ['0', '0', '0', '0', '0'], '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
};
/** Text in eine Ebene setzen; → Breite in px. */
export function text(l, x, y, str, tone) {
  const x0 = x;
  for (const ch of str) {
    const g = FONT[ch] || FONT[' '];
    g.forEach((row, j) => [...row].forEach((b, i) => b === '1' && l.set(x + i, y + j, tone)));
    x += g[0].length + 1;
  }
  return x - x0 - 1;
}
export function textWidth(str) {
  let w = 0;
  for (const ch of str) w += (FONT[ch] || FONT[' '])[0].length + 1;
  return Math.max(0, w - 1);
}

// --- Sprite-Cache ------------------------------------------------------------

const cache = new Map();
/**
 * Fertiges Teil aus dem Cache: build() → PixelArt (Anker ax/ay in extra) oder {img, glow, ax, ay}.
 * Ergebnis: { img, glow, ax, ay, halo? } – gezeichnet bei (x - ax, y - ay).
 */
export function sprite(key, build) {
  if (!cache.has(key)) {
    const r = build();
    if (r instanceof PixelArt) cache.set(key, { ...r.toCanvas(), ax: 0, ay: 0 });
    else cache.set(key, r);
  }
  return cache.get(key);
}

/** PixelArt + Anker (+ Extras wie halo) → Sprite-Objekt. */
export function fin(art, ax, ay, extra = {}) {
  return { ...art.toCanvas(), ax, ay, ...extra };
}

// Kleiner Pixel-Zeichner für Platzhalter und Boden-Deko: Ebenen mit eigener
// Outline und automatischem Licht oben links (wie tools/sprites/pixel.py).
import { RAMPS } from './palette.js';

export const OUTLINE = 0, SHADE = 1, BASE = 2, LIGHT = 3, HIGH = 4;

class Layer {
  constructor(ramp, opts) {
    this.ramp = RAMPS[ramp] || RAMPS.leaf;
    this.outline = opts.outline ?? true;
    this.shading = opts.shading ?? true;
    this.glow = !!opts.glow;
    this.px = new Map(); // key → tone|null
  }
  set(x, y, tone = null) {
    x = Math.round(x); y = Math.round(y);
    this.px.set(x + ',' + y, tone);
    return this;
  }
  rect(x, y, w, h, tone = null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, tone);
    return this;
  }
  ellipse(cx, cy, rx, ry, tone = null) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / Math.max(rx, 0.5), dy = (y + 0.5 - cy) / Math.max(ry, 0.5);
        if (dx * dx + dy * dy <= 1) this.set(x, y, tone);
      }
    return this;
  }
  line(x0, y0, x1, y1, tone = null) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, tone);
    return this;
  }
  has(x, y) {
    return this.px.has(x + ',' + y);
  }
}

export class PixelArt {
  constructor(w = 32, h = 32) {
    this.w = w; this.h = h;
    this.layers = [];
  }
  layer(ramp, opts = {}) {
    const l = new Layer(ramp, opts);
    this.layers.push(l);
    return l;
  }
  /** Zeichnet in ctx an (ox, oy). glowCtx optional für Leucht-Ebenen. */
  drawTo(ctx, ox = 0, oy = 0, glowCtx = null) {
    for (const l of this.layers) {
      const draw = (x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(ox + x, oy + y, 1, 1);
        if (glowCtx && l.glow) {
          glowCtx.fillStyle = color;
          glowCtx.fillRect(ox + x, oy + y, 1, 1);
        }
      };
      if (l.outline) {
        const done = new Set();
        for (const key of l.px.keys()) {
          const [x, y] = key.split(',').map(Number);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
            if (!l.px.has(k) && !done.has(k)) {
              done.add(k);
              draw(nx, ny, l.ramp[OUTLINE]);
            }
          }
        }
      }
      for (const [key, tone] of l.px) {
        const [x, y] = key.split(',').map(Number);
        let t = tone;
        if (t == null) {
          t = BASE;
          if (l.shading) {
            if (!l.has(x, y - 1) || !l.has(x - 1, y)) t = LIGHT;
            else if (!l.has(x, y + 1) || !l.has(x + 1, y)) t = SHADE;
          }
        }
        draw(x, y, l.ramp[t]);
      }
    }
  }
  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    const g = makeCanvas(this.w, this.h);
    this.drawTo(c.getContext('2d'), 0, 0, g.getContext('2d'));
    const hasGlow = this.layers.some((l) => l.glow);
    return { img: c, glow: hasGlow ? g : null };
  }
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

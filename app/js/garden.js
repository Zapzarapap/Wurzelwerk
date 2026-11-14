// Garten-Renderer: Welt wird 1× in ein Offscreen-Canvas komponiert
// (Boden → Pflanzen y-sortiert → Licht-Grading → Himmel → Leuchten) und dann
// mit ganzzahliger Skalierung (Geräte-Pixel pro Welt-Pixel) auf den Bildschirm gebracht.
import { layoutGarden } from './layout.js';
import { drawGround, drawSky } from './scenery.js';
import { getSprite } from './sprites.js';
import { makeCanvas } from './pixelart.js';

const groundCache = new Map();

function ground(region, W, H) {
  const key = `${region}|${W}|${H}`;
  if (!groundCache.has(key)) {
    if (groundCache.size > 8) groundCache.clear();
    groundCache.set(key, drawGround(region, W, H));
  }
  return groundCache.get(key);
}

export class GardenRenderer {
  constructor(canvas, { onTap } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onTap = onTap;
    this.world = null;
    this.layout = null;
    this.scene = null;
    this.light = null;
    this.cam = { s: 1, ox: 0, oy: 0 };
    this.userMoved = false;
    this.pointers = new Map();
    this.gesture = null;
    this.dpr = 1;
    this.selected = null;
    this.token = 0;
    this._bind();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  destroy() {
    this.ro.disconnect();
    cancelAnimationFrame(this.raf);
    this.destroyed = true;
  }

  // --- Daten ---------------------------------------------------------------
  async setData(region, plants, light) {
    const token = ++this.token;
    this.region = region;
    this.light = light;
    const layout = layoutGarden(plants, region);
    const sprites = await Promise.all(layout.items.map((it) => getSprite(it.plant.species, it.plant.stage, it.plant.variant)));
    if (token !== this.token || this.destroyed) return;
    layout.items.forEach((it, i) => (it.sprite = sprites[i]));
    const sizeChanged = !this.layout || this.layout.W !== layout.W || this.layout.H !== layout.H;
    this.layout = layout;
    this.scene = ground(region, layout.W, layout.H);
    this.compose();
    if (sizeChanged || !this.userMoved) this.fit();
    else this.render();
  }

  setLight(light) {
    this.light = light;
    if (this.layout) {
      this.compose();
      this.render();
    }
  }

  compose() {
    const { W, H, items } = this.layout;
    const L = this.light;
    if (!this.world || this.world.width !== W || this.world.height !== H) this.world = makeCanvas(W, H);
    const c = this.world.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.drawImage(this.scene.canvas, 0, 0);
    const drawItem = (it, img) => {
      const x = it.x - 16, y = it.y - 31;
      if (it.flip) {
        c.save();
        c.translate(x + 32, y);
        c.scale(-1, 1);
        c.drawImage(img, 0, 0);
        c.restore();
      } else c.drawImage(img, x, y);
    };
    for (const it of items) {
      // weicher Bodenschatten
      c.fillStyle = 'rgba(30,20,16,0.18)';
      c.fillRect(it.x - 6, it.y, 12, 1);
      drawItem(it, it.sprite.img);
    }
    // Licht-Grading
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = `rgb(${L.mult.join(',')})`;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    drawSky(c, this.scene, L, W);
    // Leuchtendes bleibt hell
    if (L.glow > 0.01) {
      c.globalAlpha = L.glow;
      c.drawImage(this.scene.glow, 0, 0);
      const halos = [...this.scene.halos];
      for (const it of items)
        if (it.sprite.glow) {
          drawItem(it, it.sprite.glow);
          halos.push({ x: it.x, y: it.y - 8, r: 14, rgb: [170, 255, 200] });
        }
      c.globalCompositeOperation = 'lighter';
      for (const h of halos) {
        const gr = c.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
        gr.addColorStop(0, `rgba(${h.rgb.join(',')},0.28)`);
        gr.addColorStop(1, `rgba(${h.rgb.join(',')},0)`);
        c.fillStyle = gr;
        c.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    }
    this._animate();
  }

  // --- Kamera --------------------------------------------------------------
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(r.width * this.dpr)), h = Math.max(1, Math.round(r.height * this.dpr));
    if (this.canvas.width === w && this.canvas.height === h) return;
    const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    this.canvas.width = w;
    this.canvas.height = h;
    if (!this.userMoved) this.fit();
    else {
      this.cam.ox += Math.round(w / 2 - cx);
      this.cam.oy += Math.round(h / 2 - cy);
      this.render();
    }
  }

  fitScale() {
    if (!this.layout) return 1;
    const { W, H } = this.layout;
    return Math.max(1, Math.floor(Math.min(this.canvas.width / W, this.canvas.height / H)));
  }

  limits() {
    const f = this.fitScale();
    return { min: Math.max(1, Math.floor(f * 0.6)), max: Math.max(f * 6, 14 * this.dpr) };
  }

  fit() {
    if (!this.layout) return this.render();
    const s = this.fitScale();
    const { W, H } = this.layout;
    this.cam = { s, ox: Math.round((this.canvas.width - W * s) / 2), oy: Math.round((this.canvas.height - H * s) / 2) };
    this.userMoved = false;
    this.render();
  }

  clamp() {
    if (!this.layout) return;
    const { W, H } = this.layout, { s } = this.cam;
    const cw = this.canvas.width, ch = this.canvas.height, pad = 48 * this.dpr;
    const cl = (v, ww, cc) => {
      const lo = Math.min(0, cc - ww) - pad, hi = Math.max(0, cc - ww) + pad;
      return Math.round(Math.max(lo, Math.min(hi, v)));
    };
    this.cam.ox = cl(this.cam.ox, W * s, cw);
    this.cam.oy = cl(this.cam.oy, H * s, ch);
  }

  zoomAt(s, px, py, anchor = null) {
    const { min, max } = this.limits();
    s = Math.max(min, Math.min(max, Math.round(s)));
    const wx = anchor ? anchor.wx : (px - this.cam.ox) / this.cam.s;
    const wy = anchor ? anchor.wy : (py - this.cam.oy) / this.cam.s;
    this.cam.s = s;
    this.cam.ox = Math.round(px - wx * s);
    this.cam.oy = Math.round(py - wy * s);
    this.userMoved = true;
    this.clamp();
    this.render();
  }

  zoomBy(f) {
    const s = this.cam.s;
    let n = Math.round(s * f);
    if (n === s) n = s + (f > 1 ? 1 : -1);
    this.zoomAt(n, this.canvas.width / 2, this.canvas.height / 2);
  }

  _pt(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * this.dpr, y: (e.clientY - r.top) * this.dpr };
  }

  _bind() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      const p = this._pt(e);
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 1) {
        this.gesture = { type: 'pan', start: p, cam: { ...this.cam }, moved: 0, t: performance.now() };
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.gesture = {
          type: 'pinch',
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          s: this.cam.s,
          anchor: { wx: (mid.x - this.cam.ox) / this.cam.s, wy: (mid.y - this.cam.oy) / this.cam.s },
          moved: 99,
        };
      }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const p = this._pt(e);
      this.pointers.set(e.pointerId, p);
      const g = this.gesture;
      if (!g) return;
      if (g.type === 'pan' && this.pointers.size === 1) {
        const dx = p.x - g.start.x, dy = p.y - g.start.y;
        g.moved = Math.max(g.moved, Math.hypot(dx, dy));
        if (g.moved > 6 * this.dpr) {
          this.cam.ox = Math.round(g.cam.ox + dx);
          this.cam.oy = Math.round(g.cam.oy + dy);
          this.userMoved = true;
          this.clamp();
          this.render();
        }
      } else if (g.type === 'pinch' && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.zoomAt(g.s * (d / g.dist), mid.x, mid.y, g.anchor);
      }
    });
    const up = (e) => {
      const g = this.gesture;
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (g && g.type === 'pan' && g.moved <= 6 * this.dpr && e.type === 'pointerup' && p) this._tap(p);
      if (this.pointers.size === 1) {
        const [q] = [...this.pointers.values()];
        this.gesture = { type: 'pan', start: q, cam: { ...this.cam }, moved: 99 };
      } else if (this.pointers.size === 0) this.gesture = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this._pt(e);
      const s = this.cam.s;
      let n = Math.round(s * (e.deltaY < 0 ? 1.25 : 0.8));
      if (n === s) n = s + (e.deltaY < 0 ? 1 : -1);
      this.zoomAt(n, p.x, p.y);
    }, { passive: false });
    cv.addEventListener('dblclick', (e) => {
      const p = this._pt(e);
      this.zoomAt(this.cam.s * 2, p.x, p.y);
    });
  }

  _tap(p) {
    if (!this.layout) return;
    const wx = (p.x - this.cam.ox) / this.cam.s, wy = (p.y - this.cam.oy) / this.cam.s;
    let hit = null;
    for (const it of this.layout.items) {
      if (wx >= it.x - 11 && wx <= it.x + 11 && wy >= it.y - 26 && wy <= it.y + 2) hit = it; // letzter = vorderster
    }
    this.selected = hit;
    this.render();
    this.onTap?.(hit);
  }

  // --- Zeichnen ------------------------------------------------------------
  render() {
    const c = this.ctx, cv = this.canvas;
    c.imageSmoothingEnabled = false;
    const L = this.light;
    const out = this.scene?.outside || [60, 46, 40];
    const m = L?.mult || [255, 255, 255];
    c.fillStyle = `rgb(${out.map((v, i) => Math.round((v * m[i]) / 255)).join(',')})`;
    c.fillRect(0, 0, cv.width, cv.height);
    if (!this.world) return;
    const { s, ox, oy } = this.cam;
    c.drawImage(this.world, ox, oy, this.world.width * s, this.world.height * s);
    // Glühwürmchen (Blumenwiese, nachts)
    if (L && L.glow > 0.3 && this.scene.fireflies.length) {
      const t = performance.now() / 1000;
      for (const f of this.scene.fireflies) {
        const a = Math.max(0, Math.sin(t * 1.3 + f.p * 3)) * L.glow;
        if (a < 0.05) continue;
        const x = f.x + Math.round(Math.sin(t * 0.4 + f.p) * 3), y = f.y + Math.round(Math.cos(t * 0.3 + f.p) * 2);
        c.fillStyle = `rgba(220,255,140,${a * 0.25})`;
        c.fillRect(ox + (x - 1) * s, oy + (y - 1) * s, 3 * s, 3 * s);
        c.fillStyle = `rgba(240,255,170,${a})`;
        c.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }
    // Auswahlmarkierung
    if (this.selected) {
      const it = this.selected;
      c.fillStyle = 'rgba(255,248,220,0.9)';
      const y = oy + (it.y + 3) * s, x0 = ox + (it.x - 5) * s;
      c.fillRect(x0, y, 10 * s, s);
    }
  }

  _animate() {
    cancelAnimationFrame(this.raf);
    if (!(this.light?.glow > 0.3 && this.scene?.fireflies.length)) return;
    let last = 0;
    const loop = (t) => {
      if (this.destroyed) return;
      if (t - last > 80 && !document.hidden) {
        last = t;
        this.render();
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
}

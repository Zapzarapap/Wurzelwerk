// Garten-Renderer: Welt wird 1× in ein Offscreen-Canvas komponiert
// (Boden → Licht-Grading → Himmel in Fenster/Glasdach → Möbel und Pflanzen
// z-sortiert, ebenfalls gegradet → Leuchten) und dann mit ganzzahliger
// Skalierung (Geräte-Pixel pro Welt-Pixel) auf den Bildschirm gebracht.
import { layoutGarden } from './layout.js';
import { drawGround, drawSky } from './scenery.js';
import { pieceSprite } from './furniture.js';
import { decorPieces } from './decor.js';
import { getSprite, NOFOOT_ANCHOR } from './sprites.js';
import { makeCanvas } from './pixelart.js';

const groundCache = new Map();

function ground(region, layout) {
  const { W, H } = layout;
  const key = `${region}|${W}|${H}`;
  if (!groundCache.has(key)) {
    if (groundCache.size > 8) groundCache.clear();
    groundCache.set(key, drawGround(region, W, H, layout));
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
    clearTimeout(this.relayoutT);
    this.ro.disconnect();
    cancelAnimationFrame(this.raf);
    this.destroyed = true;
  }

  // --- Daten ---------------------------------------------------------------
  async setData(region, plants, light) {
    const token = ++this.token;
    this.region = region;
    this.plants = plants;
    this.light = light;
    // Erst die eigentliche Fläche, dann so erweitern, dass sie den Bildschirm füllt
    const base = layoutGarden(plants, region);
    const s = this.chooseScale(base.W, base.H);
    const cw = this.canvas.width, ch = this.canvas.height;
    const layout = cw > 1 && ch > 1 ? layoutGarden(plants, region, undefined, { W: Math.floor(cw / s), H: Math.floor(ch / s) }) : base;
    layout.scale = s;
    this.viewKey = `${cw}x${ch}`;
    // Deko (weicht den Pflanzen aus, siehe decor.js)
    layout.pieces = [...(layout.pieces || []), ...decorPieces(layout)];
    // Im Gewächshaus stehen die Pflanzen in gezeichneten Beeten: Sprites ohne eigenen Beet-Fuß
    const opts = { nofoot: region === 'gewaechshaus' };
    const sprites = await Promise.all(layout.items.map((it) => getSprite(it.plant.species, it.plant.stage, it.plant.variant, opts)));
    if (token !== this.token || this.destroyed) return;
    layout.items.forEach((it, i) => (it.sprite = sprites[i]));
    const sizeChanged = !this.layout || this.layout.W !== layout.W || this.layout.H !== layout.H;
    this.layout = layout;
    this.scene = ground(region, layout);
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
    const { W, H, items, pieces = [] } = this.layout;
    const L = this.light;
    if (!this.world || this.world.width !== W || this.world.height !== H) {
      this.world = makeCanvas(W, H);
      this.objects = makeCanvas(W, H);
      this.mask = makeCanvas(W, H);
    }
    const c = this.world.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    const mult = `rgb(${L.mult.join(',')})`;
    // 1) Boden/Wände, gegradet, dann Himmel in Fenster und Glasdach
    c.drawImage(this.scene.canvas, 0, 0);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = mult;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    drawSky(c, this.scene, L, W);

    // 2) Möbel und Pflanzen nach z (vor dem Himmel, damit Pflanzen vor Fenstern stehen können)
    const o = this.objects.getContext('2d');
    o.imageSmoothingEnabled = false;
    o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, W, H);
    const drawItem = (ctx, it, img) => {
      const x = it.x - 16, y = it.y - (it.sprite.nofoot ? NOFOOT_ANCHOR : 31);
      if (it.flip) {
        ctx.save();
        ctx.translate(x + 32, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else ctx.drawImage(img, x, y);
    };
    const drawPiece = (ctx, p, sp, img) => {
      const y = p.y - sp.ay;
      if (p.flip) {
        ctx.save();
        ctx.translate(p.x - (img.width - 1 - sp.ax) + img.width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else ctx.drawImage(img, p.x - sp.ax, y);
    };
    const list = [...pieces.map((p) => ({ z: p.z, piece: p })), ...items];
    list.sort((a, b) => a.z - b.z || (a.piece ? -1 : 0) - (b.piece ? -1 : 0));
    const glowPieces = [];
    for (const e of list) {
      if (e.piece) {
        const sp = pieceSprite(e.piece);
        if (sp) {
          drawPiece(o, e.piece, sp, sp.img);
          if (sp.glow || sp.halo) glowPieces.push([e.piece, sp]);
        }
        continue;
      }
      // weicher Bodenschatten
      o.fillStyle = 'rgba(30,20,16,0.18)';
      o.fillRect(e.x - 6, e.y, 12, 1);
      drawItem(o, e, e.sprite.img);
    }
    // Grading nur auf die Objekt-Pixel: multiplizieren, dann mit der Alpha-Maske zurückschneiden
    const m = this.mask.getContext('2d');
    m.globalCompositeOperation = 'copy';
    m.drawImage(this.objects, 0, 0);
    o.globalCompositeOperation = 'multiply';
    o.fillStyle = mult;
    o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'destination-in';
    o.drawImage(this.mask, 0, 0);
    o.globalCompositeOperation = 'source-over';
    c.drawImage(this.objects, 0, 0);

    // Leuchtendes bleibt hell
    if (L.glow > 0.01) {
      c.globalAlpha = L.glow;
      c.drawImage(this.scene.glow, 0, 0);
      const halos = [...this.scene.halos];
      for (const [p, sp] of glowPieces) {
        if (sp.glow) drawPiece(c, p, sp, sp.glow);
        if (sp.halo) halos.push({ x: p.x + (p.flip ? -sp.halo.dx : sp.halo.dx), y: p.y + sp.halo.dy, r: sp.halo.r, rgb: sp.halo.rgb });
      }
      for (const it of items)
        if (it.sprite.glow) {
          drawItem(c, it, it.sprite.glow);
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
      // Mondlicht zwischen den Baumkronen (Wald)
      if (this.scene.moonbeams && L.glow > 0.3) {
        c.globalAlpha = 1;
        for (const b of this.scene.moonbeams) {
          const gr = c.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, `rgba(170,190,255,${0.11 * L.glow})`);
          gr.addColorStop(1, 'rgba(170,190,255,0)');
          c.fillStyle = gr;
          c.beginPath();
          c.moveTo(b.x, 18);
          c.lineTo(b.x + b.w, 18);
          c.lineTo(b.x + b.w + b.dx, H);
          c.lineTo(b.x + b.dx, H);
          c.closePath();
          c.fill();
        }
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    }
    this._animate();
  }

  // --- Kamera --------------------------------------------------------------
  /**
   * Maßstab (Geräte-Pixel pro Welt-Pixel), mit dem eine W×H-Welt ganz zu sehen ist.
   * Ab 4 ganzzahlig (scharf), darunter fein gestuft, damit große Orte nicht
   * auf die Hälfte schrumpfen. Die Welt wird danach auf Bildschirmgröße erweitert.
   */
  chooseScale(W, H) {
    const cw = this.canvas.width, ch = this.canvas.height;
    const s = Math.min(cw / W, ch / H);
    if (!(s > 0) || !Number.isFinite(s)) return 1;
    if (s >= 4) return Math.floor(s);
    return Math.max(0.5, Math.floor(s * 8) / 8);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(r.width * this.dpr)), h = Math.max(1, Math.round(r.height * this.dpr));
    if (this.canvas.width === w && this.canvas.height === h) return;
    const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    this.canvas.width = w;
    this.canvas.height = h;
    // Neue Bildschirmgröße: Fläche neu auffüllen
    if (this.plants && this.viewKey !== `${w}x${h}`) {
      clearTimeout(this.relayoutT);
      this.relayoutT = setTimeout(() => this.setData(this.region, this.plants, this.light), 60);
    }
    if (!this.userMoved) this.fit();
    else {
      this.cam.ox += Math.round(w / 2 - cx);
      this.cam.oy += Math.round(h / 2 - cy);
      this.render();
    }
  }

  fitScale() {
    if (!this.layout) return 1;
    const { W, H, scale } = this.layout;
    // Aufgefüllte Fläche: genau der Maßstab, für den sie gebaut wurde
    if (scale && W * scale <= this.canvas.width + 0.5 && H * scale <= this.canvas.height + 0.5) return scale;
    return this.chooseScale(W, H);
  }

  limits() {
    const f = this.fitScale();
    return { min: f, max: Math.max(f * 6, 14 * this.dpr) };
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
    s = Math.min(max, s);
    s = s <= min + 1e-6 ? min : Math.max(min, s >= 2 ? Math.round(s) : Math.round(s * 4) / 4);
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
    let n = s * f >= 2 ? Math.round(s * f) : s * f;
    if (Math.abs(n - s) < 0.01) n = s + (f > 1 ? 1 : -1);
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
      let n = s * (e.deltaY < 0 ? 1.25 : 0.8);
      if (n >= 2) n = Math.round(n);
      if (Math.abs(n - s) < 0.01) n = s + (e.deltaY < 0 ? 1 : -1);
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
    c.drawImage(this.world, ox, oy, Math.round(this.world.width * s), Math.round(this.world.height * s));
    // Welt-Pixel → Geräte-Pixel (auch bei krummem Maßstab ohne Kantenglättung)
    const wr = (x, y, w, hh) => {
      const x0 = Math.round(ox + x * s), y0 = Math.round(oy + y * s);
      c.fillRect(x0, y0, Math.round(ox + (x + w) * s) - x0, Math.round(oy + (y + hh) * s) - y0);
    };
    // Glühwürmchen (Blumenwiese, nachts)
    if (L && L.glow > 0.3 && this.scene.fireflies.length) {
      const t = performance.now() / 1000;
      for (const f of this.scene.fireflies) {
        const a = Math.max(0, Math.sin(t * 1.3 + f.p * 3)) * L.glow;
        if (a < 0.05) continue;
        const x = f.x + Math.round(Math.sin(t * 0.4 + f.p) * 3), y = f.y + Math.round(Math.cos(t * 0.3 + f.p) * 2);
        c.fillStyle = `rgba(220,255,140,${a * 0.25})`;
        wr(x - 1, y - 1, 3, 3);
        c.fillStyle = `rgba(240,255,170,${a})`;
        wr(x, y, 1, 1);
      }
    }
    // Schmetterlinge und Bienen (Blumenwiese, tagsüber)
    const crit = this.scene.critters;
    if (L && crit?.length && L.glow < 0.5) {
      const t = this.still ? 0 : performance.now() / 1000;
      const a = 1 - L.glow * 2;
      const tint = (rgb) => `rgba(${rgb.map((v, i) => Math.round((v * m[i]) / 255)).join(',')},${a})`;
      const px = (x, y, col) => { c.fillStyle = col; wr(x, y, 1, 1); };
      for (const f of crit) {
        if (f.bee) {
          const x = Math.round(f.x + Math.sin(t * 0.7 + f.p) * 9 + Math.sin(t * 5 + f.p) * 1);
          const y = Math.round(f.y + Math.cos(t * 0.9 + f.p) * 5);
          px(x, y, tint([230, 180, 40]));
          px(x + 1, y, tint([50, 36, 30]));
          if (Math.floor(t * 12 + f.p) % 2) px(x, y - 1, tint([240, 244, 255]));
        } else {
          const x = Math.round(f.x + Math.sin(t * 0.35 + f.p) * 14);
          const y = Math.round(f.y + Math.sin(t * 0.5 + f.p * 2) * 6 + Math.sin(t * 2.1 + f.p) * 1.5);
          const open = Math.floor(t * 4 + f.p) % 2 === 0;
          px(x, y, tint([60, 40, 40]));
          px(x, y + 1, tint([60, 40, 40]));
          if (open) { px(x - 1, y, tint(f.rgb)); px(x + 1, y, tint(f.rgb)); px(x - 1, y + 1, tint(f.rgb2)); px(x + 1, y + 1, tint(f.rgb2)); }
          else { px(x - 1, y - 1, tint(f.rgb)); px(x + 1, y - 1, tint(f.rgb)); }
        }
      }
    }
    // Auswahlmarkierung
    if (this.selected) {
      const it = this.selected;
      c.fillStyle = 'rgba(255,248,220,0.9)';
      wr(it.x - 5, it.y + 3, 10, 1);
    }
  }

  _animate() {
    cancelAnimationFrame(this.raf);
    // Sparsam: nur wenn etwas lebt (Glühwürmchen nachts, Falter tagsüber), höchstens ~10 fps,
    // nicht bei verstecktem Tab und nicht bei „Bewegung reduzieren“.
    const night = this.light?.glow > 0.3 && this.scene?.fireflies.length;
    const day = this.light?.glow < 0.5 && this.scene?.critters?.length;
    this.still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!(night || day) || this.still) return;
    const step = night ? 80 : 110;
    let last = 0;
    const loop = (t) => {
      if (this.destroyed) return;
      if (t - last > step && !document.hidden && this.canvas.isConnected) {
        last = t;
        this.render();
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
}

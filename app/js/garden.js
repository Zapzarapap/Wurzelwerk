// Orte-Renderer (generisch für alle Regionen, siehe docs/SZENEN.md).
// Die Szene kommt aus scenekit/engine.js (Stellplätze, Deko), Hintergrund und
// Teile zeichnet das Regionsmodul in app/js/scenes/<region>.js.
//
// Ebenen, je einmal in ein Offscreen-Canvas komponiert:
//   0 Himmel (wenn paint() sky: true meldet; scheint durch Löcher im Hintergrund)
//   1 Hintergrund (gegradet)
//   2 Teile + Pflanzen gemeinsam nach z sortiert (gegradet)
//   3 Vordergrund (scene.front, gegradet)
//   4 Licht: Leucht-Masken, Lichthöfe, Strahlen (nachts/tags)
// Innenraum-Zonen (paint() → indoor) werden nachts warm statt blau gegradet.
// Danach mit ganzzahliger (bzw. fein gestufter) Skalierung auf den Bildschirm.
// Animiertes (Glühwürmchen, Falter) malt render() direkt, sparsam (≤ 12 fps).
import { buildScene, hitTest } from './scenekit/engine.js';
import { paintSky, drawGraded, drawHalos, drawBeams, tint, indoorMult } from './scenekit/light.js';
import { drawSprite } from './scenekit/draw.js';
import { prop } from './scenekit/props.js';
import { SCENES } from './scenes/index.js';
import { getSprite, NOFOOT_ANCHOR } from './sprites.js';
import { makeCanvas } from './pixelart.js';
import { CONFIG } from './config.js';

// Hintergründe (LRU): Schlüssel wie bisher, aber begrenzt über die Pixelzahl
// (Hintergrund + Leucht-Ebene), statt bei > 6 Einträgen alles zu verwerfen.
// Große Szenen belegen ~8 MB pro Ebene – auf dem iPhone ist Canvas-Speicher knapp.
// Der Wald cacht seinen Boden zusätzlich kachelweise (neue Abschnitte/Filter/Resize
// berechnen nur neue Kacheln).
const bgCache = new Map();
const BG_BUDGET = 9e6; // Pixel
const bgPixels = (bg) => (bg.canvas?.width || 0) * (bg.canvas?.height || 0) * (bg.glow ? 2 : 1);

function background(mod, scene) {
  const key = `${mod.id}|${scene.W}x${scene.H}|${scene.sections.length}|${scene.ox},${scene.oy}`;
  let bg = bgCache.get(key);
  if (bg) {
    bgCache.delete(key); // nach hinten = zuletzt benutzt
    bgCache.set(key, bg);
    return bg;
  }
  bg = mod.paint(scene);
  bg.halos ||= [];
  bg.beams ||= [];
  bg.fx = { fireflies: [], critters: [], ...(bg.fx || {}) };
  let total = bgPixels(bg);
  for (const v of bgCache.values()) total += bgPixels(v);
  for (const [k, v] of bgCache) {
    if (total <= BG_BUDGET) break;
    total -= bgPixels(v);
    bgCache.delete(k);
  }
  bgCache.set(key, bg);
  return bg;
}

/** Sprite eines Teils: gemeinsames Requisit (piece.prop) oder vom Regionsmodul. */
export function pieceSprite(mod, p) {
  if (p.prop) return prop(p.prop, p.v || 0);
  return mod.sprite ? mod.sprite(p) : null;
}

export class GardenRenderer {
  constructor(canvas, { onTap } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onTap = onTap;
    // Pan/Zoom nur, wenn CONFIG.garden.ortZoomEnabled; sonst feste Ansicht "ganzer Ort"
    this.zoomEnabled = !!CONFIG.garden.ortZoomEnabled;
    this.world = null;
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
    const mod = SCENES[region] || SCENES.pflanzenhandlung;
    // Erst die eigentliche Fläche, dann so erweitern, dass sie den Bildschirm füllt
    const base = buildScene(mod, plants);
    const s = this.chooseScale(base.W, base.H);
    const cw = this.canvas.width, ch = this.canvas.height;
    const scene = cw > 1 && ch > 1 ? buildScene(mod, plants, { W: Math.floor(cw / s), H: Math.floor(ch / s) }) : base;
    scene.scale = s;
    this.viewKey = `${cw}x${ch}`;
    const sprites = await Promise.all(scene.items.map((it) =>
      getSprite(it.plant.species, it.plant.stage, it.plant.variant, { nofoot: !!(it.spot.nofoot ?? mod.nofoot) })));
    if (token !== this.token || this.destroyed) return;
    scene.items.forEach((it, i) => (it.sprite = sprites[i]));
    const sizeChanged = !this.scene || this.scene.W !== scene.W || this.scene.H !== scene.H;
    this.mod = mod;
    this.scene = scene;
    this.bg = background(mod, scene);
    if (this.selected) this.selected = scene.items.find((it) => it.plant.id === this.selected.plant.id) || null;
    this.compose();
    if (!this.zoomEnabled || sizeChanged || !this.userMoved) this.fit();
    else this.render();
  }

  setLight(light) {
    this.light = light;
    if (this.scene) {
      this.compose();
      this.render();
    }
  }

  compose() {
    const { W, H, items, pieces, front } = this.scene;
    const L = this.light, mod = this.mod, bg = this.bg;
    if (!this.world || this.world.width !== W || this.world.height !== H) {
      this.world = makeCanvas(W, H);
      this.layer = makeCanvas(W, H);
      this.tmp = makeCanvas(W, H);
    }
    const c = this.world.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    // 0 + 1) Himmel, Hintergrund
    if (bg.sky) paintSky(c, W, H, L, bg.skySeed || 7);
    const zones = bg.indoor || null;
    const inMult = zones ? indoorMult(L, bg.indoorWarm) : null;
    drawGraded(c, bg.canvas, L, this.tmp, zones, inMult);

    // 2) Teile und Pflanzen nach z
    const o = this.layer.getContext('2d');
    o.imageSmoothingEnabled = false;
    const glowList = [];
    const drawPlant = (ctx, it, img) => {
      const x = it.x - 16, y = it.y - (it.sprite.nofoot ? NOFOOT_ANCHOR : 31);
      if (it.flip) {
        ctx.save();
        ctx.translate(x + 32, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else ctx.drawImage(img, x, y);
    };
    const drawList = (list) => {
      o.globalCompositeOperation = 'source-over';
      o.clearRect(0, 0, W, H);
      for (const e of list) {
        if (e.plant) {
          if (e.spot.shadow !== false) {
            o.fillStyle = 'rgba(30,20,16,0.2)';
            o.fillRect(e.x - 6, e.y, 12, 1);
          }
          drawPlant(o, e, e.sprite.img);
          if (e.sprite.glow) glowList.push(['plant', e]);
          continue;
        }
        const sp = pieceSprite(mod, e);
        if (!sp) continue;
        drawSprite(o, sp.img, sp, e.x, e.y, e.flip);
        if (sp.glow || sp.halo) glowList.push(['piece', e, sp]);
      }
      drawGraded(c, this.layer, L, this.tmp, zones, inMult);
    };
    const objs = [...pieces, ...items].sort((a, b) => a.z - b.z || (a.plant ? 1 : 0) - (b.plant ? 1 : 0));
    drawList(objs);
    // 3) Vordergrund
    if (front.length) drawList(front);

    // 4) Licht
    if (bg.beams.length) drawBeams(c, bg.beams, L);
    if (L.glow > 0.01) {
      c.globalAlpha = L.glow;
      c.drawImage(bg.glow, 0, 0);
      const halos = [...bg.halos];
      for (const [kind, e, sp] of glowList) {
        if (kind === 'plant') {
          drawPlant(c, e, e.sprite.glow);
          halos.push({ x: e.x, y: e.y - 8, r: 14, rgb: [170, 255, 200] });
        } else {
          if (sp.glow) drawSprite(c, sp.glow, sp, e.x, e.y, e.flip);
          if (sp.halo) halos.push({ ...sp.halo, x: e.x + (e.flip ? -sp.halo.dx : sp.halo.dx), y: e.y + sp.halo.dy });
        }
      }
      c.globalAlpha = 1;
      drawHalos(c, halos, L.glow);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
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
    if (this.plants && this.viewKey !== `${w}x${h}`) {
      clearTimeout(this.relayoutT);
      this.relayoutT = setTimeout(() => this.setData(this.region, this.plants, this.light), 60);
    }
    if (!this.zoomEnabled || !this.userMoved) this.fit();
    else {
      this.cam.ox += Math.round(w / 2 - cx);
      this.cam.oy += Math.round(h / 2 - cy);
      this.render();
    }
  }

  fitScale() {
    if (!this.scene) return 1;
    const { W, H, scale } = this.scene;
    if (scale && W * scale <= this.canvas.width + 0.5 && H * scale <= this.canvas.height + 0.5) return scale;
    return this.chooseScale(W, H);
  }

  limits() {
    const f = this.fitScale();
    return { min: f, max: Math.max(f * 6, 14 * this.dpr) };
  }

  fit() {
    if (!this.scene) return this.render();
    const s = this.fitScale();
    const { W, H } = this.scene;
    this.cam = { s, ox: Math.round((this.canvas.width - W * s) / 2), oy: Math.round((this.canvas.height - H * s) / 2) };
    this.userMoved = false;
    this.render();
  }

  clamp() {
    if (!this.scene) return;
    const { W, H } = this.scene, { s } = this.cam;
    const cw = this.canvas.width, ch = this.canvas.height, pad = 48 * this.dpr;
    const cl = (v, ww, cc) => {
      const lo = Math.min(0, cc - ww) - pad, hi = Math.max(0, cc - ww) + pad;
      return Math.round(Math.max(lo, Math.min(hi, v)));
    };
    this.cam.ox = cl(this.cam.ox, W * s, cw);
    this.cam.oy = cl(this.cam.oy, H * s, ch);
  }

  zoomAt(s, px, py, anchor = null) {
    if (!this.zoomEnabled) return;
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
    if (!this.zoomEnabled) return;
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
    if (!this.zoomEnabled) return this._bindFixed();
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

  /** Feste Ansicht: nur Tippen (kein Pan/Pinch/Rad/Doppeltipp). Mehrfinger-Berührung zählt nicht als Tippen. */
  _bindFixed() {
    const cv = this.canvas;
    let start = null, multi = false;
    cv.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, this._pt(e));
      if (this.pointers.size > 1) multi = true;
      start = this.pointers.size === 1 ? { p: this._pt(e), id: e.pointerId } : null;
    });
    cv.addEventListener('pointermove', (e) => {
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, this._pt(e));
    });
    const up = (e) => {
      const p = this._pt(e);
      this.pointers.delete(e.pointerId);
      const ok = start && start.id === e.pointerId && !multi && e.type === 'pointerup'
        && Math.hypot(p.x - start.p.x, p.y - start.p.y) <= 10 * this.dpr;
      if (this.pointers.size === 0) { multi = false; start = null; }
      if (ok) this._tap(p);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    // iOS-Safari-Pinch/Doppeltipp-Zoom der Seite über der Fläche verhindern
    for (const t of ['gesturestart', 'gesturechange']) cv.addEventListener(t, (e) => e.preventDefault());
  }

  _tap(p) {
    if (!this.scene) return;
    const wx = (p.x - this.cam.ox) / this.cam.s, wy = (p.y - this.cam.oy) / this.cam.s;
    // Fingertoleranz ≈ 6 CSS-px, in Welt-Pixeln (1…6)
    const tol = Math.max(1, Math.min(6, Math.round((6 * this.dpr) / this.cam.s)));
    const hit = hitTest(this.scene.items, wx, wy, { tol });
    this.selected = hit;
    this.render();
    this.onTap?.(hit);
  }

  // --- Zeichnen ------------------------------------------------------------
  render() {
    const c = this.ctx, cv = this.canvas;
    c.imageSmoothingEnabled = false;
    const L = this.light;
    const out = this.bg?.outside || [60, 46, 40];
    const m = L?.mult || [255, 255, 255];
    // Rand außerhalb der Welt: Himmelsfarbe (Szenen mit Himmel) bzw. gegradete Randfarbe
    c.fillStyle = this.bg?.sky && L ? `rgb(${L.sky.join(',')})` : `rgb(${out.map((v, i) => Math.round((v * m[i]) / 255)).join(',')})`;
    c.fillRect(0, 0, cv.width, cv.height);
    if (!this.world) return;
    const { s, ox, oy } = this.cam;
    c.drawImage(this.world, ox, oy, Math.round(this.world.width * s), Math.round(this.world.height * s));
    const wr = (x, y, w, hh) => {
      const x0 = Math.round(ox + x * s), y0 = Math.round(oy + y * s);
      c.fillRect(x0, y0, Math.round(ox + (x + w) * s) - x0, Math.round(oy + (y + hh) * s) - y0);
    };
    const fx = this.bg.fx;
    const t = this.still ? 0 : performance.now() / 1000;
    // Glühwürmchen (nachts)
    if (L && L.glow > 0.3 && fx.fireflies.length) {
      for (const f of fx.fireflies) {
        const a = Math.max(0, Math.sin(t * 1.3 + f.p * 3)) * L.glow;
        if (a < 0.05) continue;
        const x = f.x + Math.round(Math.sin(t * 0.4 + f.p) * 3), y = f.y + Math.round(Math.cos(t * 0.3 + f.p) * 2);
        c.fillStyle = `rgba(220,255,140,${a * 0.25})`;
        wr(x - 1, y - 1, 3, 3);
        c.fillStyle = `rgba(240,255,170,${a})`;
        wr(x, y, 1, 1);
      }
    }
    // Falter und Bienen (tagsüber)
    if (L && fx.critters.length && L.glow < 0.5) {
      const a = 1 - L.glow * 2;
      const px = (x, y, rgb) => { c.fillStyle = tint(rgb, L, a); wr(x, y, 1, 1); };
      for (const f of fx.critters) {
        if (f.bee) {
          const x = Math.round(f.x + Math.sin(t * 0.7 + f.p) * 9 + Math.sin(t * 5 + f.p) * 1);
          const y = Math.round(f.y + Math.cos(t * 0.9 + f.p) * 5);
          px(x, y, [230, 180, 40]);
          px(x + 1, y, [50, 36, 30]);
          if (Math.floor(t * 12 + f.p) % 2) px(x, y - 1, [240, 244, 255]);
        } else {
          const x = Math.round(f.x + Math.sin(t * 0.35 + f.p) * 14);
          const y = Math.round(f.y + Math.sin(t * 0.5 + f.p * 2) * 6 + Math.sin(t * 2.1 + f.p) * 1.5);
          const open = Math.floor(t * 4 + f.p) % 2 === 0;
          px(x, y, [60, 40, 40]);
          px(x, y + 1, [60, 40, 40]);
          if (open) { px(x - 1, y, f.rgb); px(x + 1, y, f.rgb); px(x - 1, y + 1, f.rgb2); px(x + 1, y + 1, f.rgb2); }
          else { px(x - 1, y - 1, f.rgb); px(x + 1, y - 1, f.rgb); }
        }
      }
    }
    if (this.selected) {
      const it = this.selected;
      c.fillStyle = 'rgba(255,248,220,0.9)';
      wr(it.x - 5, it.y + 2, 10, 1);
    }
  }

  _animate() {
    cancelAnimationFrame(this.raf);
    const fx = this.bg?.fx;
    const night = this.light?.glow > 0.3 && fx?.fireflies.length;
    const day = this.light?.glow < 0.5 && fx?.critters.length;
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

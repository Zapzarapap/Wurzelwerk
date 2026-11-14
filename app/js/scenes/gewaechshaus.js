// Gewächshaus – Szene (API: docs/SZENEN.md).
// Stand: Migration des v0.4-Looks auf das Szenen-System (Erdbeete mit Holzrand
// in einem wachsenden Raster, Kieswege, Glaswand mit Ziegelsockel). Wird in
// Phase B als eigene Region überarbeitet.
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, C, Buf, trap, fin, sprite } from '../scenekit/draw.js';
import { gridSequence } from '../scenekit/engine.js';
import { rng, noise, hashString } from '../scenekit/rng.js';

const CELL = { w: 64, h: 42 };
const PAD = { top: 40, left: 8, right: 8, bottom: 4 };
const GRID = { cw: CELL.w, ch: CELL.h, aspect: 1.4, start: [2, 2] };
// Beet in Zellkoordinaten
const BED = { x0: 3, x1: 60, top: 6, front: 25, bottom: 31, rows: [{ y: 15, xs: [14, 32, 50] }, { y: 23, xs: [23, 41] }] };
const GRAVEL = [[120, 104, 84], [168, 150, 120], [196, 180, 150], [214, 200, 172]];
const PLASTER = [[120, 92, 70], [196, 166, 128], [224, 200, 162], [236, 216, 182], [246, 234, 210]];

let seq = [];
const cellOf = (i) => {
  if (i >= seq.length) seq = gridSequence(Math.max(i + 1, seq.length * 2, 16), GRID);
  return seq[i];
};

export default {
  id: 'gewaechshaus',
  nofoot: true,
  anchor: 'top',
  pad: PAD,
  minSections: 4,

  section(i) {
    const [c, r] = cellOf(i);
    const spots = [];
    for (const row of BED.rows) for (const x of row.xs) spots.push({ x, y: row.y, kind: 'bed', ground: 'soil', hit: { dx: 7, up: 18 } });
    return { rect: { x: c * CELL.w, y: r * CELL.h, w: CELL.w, h: CELL.h }, c, r, spots };
  },

  pieces(scene) {
    const out = [];
    const P = (kind, x, y, z, v = 0, flip = false, extra = {}) => out.push({ kind, x, y, z, v, flip, ...extra });
    const top = scene.content.y0 + PAD.top;
    const cols = new Map();
    for (const s of scene.sections) {
      const { x, y } = s.rect;
      P('bed', x, y + BED.top, y + BED.top, (s.c * 7 + s.r * 3) % 4);
      const rr = rng(`gewaechshaus:${s.c}:${s.r}`);
      if (rr() < 0.28) {
        const gx = x + 8 + Math.floor(rr() * 46), gy = y + CELL.h - 2;
        out.push({ prop: 'can', x: gx, y: gy, z: gy, v: rr() < 0.5 ? 0 : 1 });
      }
      // Kieswege unter den Beeten
      const rp = rng(`gh:path:${s.c}:${s.r}`);
      if (rp() < 0.62) {
        const kinds = ['barrow', 'sack', 'hose', 'straw', 'sack', 'barrow'];
        const part = kinds[Math.floor(rp() * kinds.length)];
        const gy = y + CELL.h - 2, px = x + 14 + Math.round(rp() * 36);
        if (part === 'sack') out.push({ prop: 'sack', x: px, y: gy, z: gy, v: Math.floor(rp() * 2) });
        else P(part, px, gy, gy, Math.floor(rp() * 2), rp() < 0.5);
      }
      if (!cols.has(s.c)) cols.set(s.c, x);
    }
    // hinten an der Glaswand
    for (const [c, x] of cols) {
      const rb = rng('gh:back:' + c);
      const t = rb(), bx = x + 32 + Math.round((rb() - 0.5) * 14), flip = rb() < 0.5;
      if (t < 0.36) P('seedshelf', bx, top + 4, top + 4, 0, flip);
      else if (t < 0.7) P('toolboard', bx, top - 4, 0.2);
      else if (t < 0.85) out.push({ prop: 'sack', x: bx, y: top + 4, z: top + 4, v: 1, flip });
      else P('straw', bx, top + 4, top + 4, 0, flip);
    }
    P('thermo', scene.content.x0 + 20, 23, 0.1);
    // Schildchen in freien Beetplätzen
    for (const s of scene.free) {
      const rr = rng('gh:stake:' + s.key);
      if (rr() < 0.42) P('stake', s.x + Math.round((rr() - 0.5) * 4), s.y, s.z, Math.floor(rr() * 3), false, { spot: s.key });
    }
    return out;
  },

  sprite(p) {
    const b = BUILD[p.kind];
    return b ? sprite(`gh|${p.kind}|${p.v || 0}`, () => b(p.v || 0)) : null;
  },

  paint(scene) {
    const { W, H } = scene;
    const seed = hashString('gewaechshaus');
    const b = new Buf(W, H);
    const halos = [];
    const glassH = 27, knee = PAD.top - 3;
    for (let y = knee; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x, y, seed + 1), n2 = noise(x >> 2, y >> 2, seed + 4);
        let col = GRAVEL[n2 > 0.72 ? 1 : 2];
        if (n > 0.93) col = GRAVEL[3];
        else if (n < 0.04) col = GRAVEL[0];
        else if (n < 0.12) col = GRAVEL[1];
        b.set(x, y, col);
      }
    // Trittplatten in den Wegen
    for (const s of scene.sections) {
      const py = s.rect.y + CELL.h - 6;
      for (let x = s.rect.x + 6 + (s.r % 2) * 9; x < s.rect.x + CELL.w - 8; x += 19) {
        if (noise(x, s.r, seed + 2) < 0.35) continue;
        for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
          if ((i === 0 || i === 7) && (j === 0 || j === 3)) continue;
          const edge = j === 3 || i === 7 ? 1 : j === 0 || i === 0 ? 3 : 2;
          b.set(x + i, py + j, edge === 3 ? PLASTER[3] : edge === 1 ? GRAVEL[0] : PLASTER[2]);
        }
      }
    }
    // Ziegelsockel
    for (let y = glassH; y < knee; y++)
      for (let x = 0; x < W; x++) {
        const row = y - glassH, off = (row >> 2) % 2 ? 4 : 0;
        let col = C.terracotta[2];
        if (row % 4 === 3 || (x + off) % 8 === 0) col = C.terracotta[1];
        else if (noise(x, y, seed + 6) > 0.8) col = C.terracotta[3];
        b.set(x, y, col);
      }
    b.rect(0, glassH, W, 1, C.wood[3]);
    b.rect(0, glassH + 1, W, 1, C.wood[1]);
    b.rect(0, knee, W, 1, C.terracotta[0]);
    // Glaswand: Himmel scheint durch (durchsichtig), leichte Spiegelung, Sprossen
    for (let y = 0; y < glassH; y++) for (let x = 0; x < W; x++) if ((x + y) % 9 === 0 && y > 10) b.set(x, y, [255, 255, 255], 40);
    const frame = [200, 210, 208], frameD = [120, 132, 134];
    const panes = Math.max(2, Math.round(W / 16));
    for (let i = 0; i <= panes; i++) b.vline(Math.round((i * (W - 1)) / panes), 0, glassH - 1, frame);
    b.rect(0, 9, W, 1, frame);
    b.rect(0, 0, W, 2, frame);
    b.rect(0, 2, W, 1, frameD);
    for (let x = 0; x < W; x += 2) b.rect(x, Math.round(9 - 7 * Math.abs((x / W) * 2 - 1)), 2, 1, frame);
    for (let y = glassH; y < H; y++) { b.set(0, y, C.dark[3]); b.set(W - 1, y, C.dark[3]); }
    // Laternen am Sockel
    const cols = [...new Set(scene.sections.map((s) => s.rect.x))].sort((a, z) => a - z);
    const xs = [...cols, cols[cols.length - 1] + CELL.w];
    for (const x of xs) {
      const lx = Math.max(4, Math.min(W - 5, x));
      b.rect(lx, glassH + 2, 1, 2, C.dark[2]);
      b.rect(lx - 2, glassH + 4, 5, 6, C.dark[2]);
      b.set(lx, glassH + 3, C.dark[3]);
      for (let j = 0; j < 4; j++) for (let i = -1; i <= 1; i++) b.glow(lx + i, glassH + 5 + j, C.lamp[j === 0 ? 3 : 2]);
      halos.push({ x: lx + 0.5, y: glassH + 7, r: 24, rgb: [255, 196, 110] });
    }
    const { canvas, glow } = b.finish();
    return { canvas, glow, halos, sky: true, skySeed: 5, outside: [52, 40, 34] };
  },
};

// --- Teile -----------------------------------------------------------------------

function bed(v) {
  const { x0, x1, top, front, bottom } = BED;
  const a = new PixelArt(CELL.w, bottom + 3);
  const soil = a.layer('gh_earth', { outline: false, shading: false });
  for (let y = top + 2; y <= front - 1; y++)
    for (let x = x0 + 2; x <= x1 - 2; x++) {
      const n = ((x * 73856093) ^ (y * 19349663) ^ (v * 83492791)) >>> 0;
      let t = BASE;
      if (y === top + 2) t = OUTLINE;
      else if (y === top + 3 || x === x0 + 2) t = SHADE;
      else if (n % 11 === 0) t = LIGHT;
      else if (n % 13 === 0) t = SHADE;
      for (const r of BED.rows) if (y === r.y + 1 && n % 3) t = SHADE;
      if (y === front - 1) t = SHADE;
      soil.set(x, y, t);
    }
  const rim = a.layer('wood');
  for (let x = x0; x <= x1; x++) rim.set(x, top, LIGHT).set(x, top + 1, BASE);
  for (let y = top; y <= bottom; y++) {
    rim.set(x0, y, LIGHT).set(x0 + 1, y, BASE);
    rim.set(x1 - 1, y, BASE).set(x1, y, SHADE);
  }
  for (let x = x0; x <= x1; x++) {
    rim.set(x, front, HIGH).set(x, front + 1, LIGHT);
    for (let y = front + 2; y <= bottom; y++) rim.set(x, y, (y - front) % 3 === 1 ? SHADE : BASE);
  }
  const posts = a.layer('wood');
  for (const px of [x0, x1 - 2]) {
    for (let y = top - 1; y <= bottom + 1; y++) posts.set(px, y, LIGHT).set(px + 1, y, BASE).set(px + 2, y, SHADE);
    posts.set(px + 1, top - 1, HIGH);
  }
  const seam = a.layer('wood', { outline: false, shading: false });
  for (const sx of [x0 + 18 + v * 3, x0 + 38 - v * 2]) for (let y = front + 2; y <= bottom; y++) seam.set(sx, y, OUTLINE);
  if (v === 1 || v === 3) {
    const sign = a.layer('cream');
    const sx = v === 1 ? x0 + 6 : x1 - 10;
    sign.rect(sx, front + 2, 5, 3, LIGHT);
    sign.set(sx + 1, front + 3, SHADE).set(sx + 2, front + 3, SHADE).set(sx + 3, front + 3, BASE);
  }
  // Anker links oben, z = Oberkante hinterer Rand
  return fin(a, 0, BED.top);
}

const BUILD = {
  bed,
  barrow(v) {
    const a = new PixelArt(24, 14);
    const hd = a.layer('wood', { outline: false, shading: false });
    hd.line(7, 6, 0, 9, BASE).line(7, 7, 1, 10, SHADE);
    const legs = a.layer('dark', { outline: false, shading: false });
    legs.line(9, 9, 8, 13, HIGH).line(15, 9, 14, 13, LIGHT);
    trap(a.layer(v ? 'petal_red' : 'leaf_deep'), 13, 3, 8, 16, 9);
    const soil = a.layer('soil', { outline: false, shading: false });
    for (let x = 6; x <= 19; x++) soil.set(x, 3, x % 4 ? BASE : LIGHT);
    const wh = a.layer('dark');
    wh.ellipse(19.5, 10.5, 2.5, 2.5);
    wh.set(19, 10, HIGH);
    return fin(a, 12, 13);
  },
  toolboard() {
    const a = new PixelArt(26, 18);
    a.layer('wood').rect(1, 2, 24, 12);
    const holes = a.layer('wood', { outline: false, shading: false });
    for (let y = 4; y <= 12; y += 3) for (let x = 3; x <= 23; x += 3) holes.set(x, y, SHADE);
    a.layer('wood', { outline: false, shading: false }).line(5, 3, 5, 16, HIGH);
    a.layer('dark').rect(3, 15, 5, 1);
    const spade = a.layer('wood', { outline: false, shading: false });
    spade.line(12, 1, 12, 9, LIGHT);
    spade.rect(11, 1, 3, 1, BASE);
    const bl = a.layer('ph_pot_slate');
    bl.rect(10, 9, 5, 5);
    bl.set(11, 14, BASE).set(12, 14, BASE).set(13, 14, BASE);
    a.layer('ph_pot_slate', { outline: false, shading: false }).line(18, 4, 21, 10, HIGH).line(21, 4, 18, 10, LIGHT);
    a.layer('petal_red').rect(17, 11, 2, 2).rect(20, 11, 2, 2);
    return fin(a, 13, 17);
  },
  seedshelf() {
    const a = new PixelArt(24, 24);
    a.layer('wood').rect(1, 1, 2, 22).rect(21, 1, 2, 22);
    for (const y of [8, 15, 21]) {
      a.layer('wood').rect(1, y, 22, 2);
      for (const tx of [4, 13]) {
        a.layer('dark').rect(tx, y - 2, 7, 2);
        const sd = a.layer('leaf', { outline: false, shading: false });
        for (let x = tx; x < tx + 7; x += 2) sd.set(x, y - 3, (x + y) % 4 ? LIGHT : HIGH);
        if (y !== 21) for (let x = tx + 1; x < tx + 7; x += 2) sd.set(x, y - 4, BASE);
      }
    }
    return fin(a, 12, 23);
  },
  straw() {
    const a = new PixelArt(18, 12);
    a.layer('gh_pumpkin_beige').rect(1, 2, 16, 9);
    const st = a.layer('gh_pumpkin_beige', { outline: false, shading: false });
    for (let i = 0; i < 26; i++) {
      const n = (i * 2654435761) >>> 0;
      st.set(2 + (n % 15), 3 + ((n >>> 8) % 7), (n >>> 4) % 3 ? SHADE : HIGH);
    }
    for (let x = 1; x <= 16; x++) st.set(x, 2, HIGH).set(x, 3, LIGHT);
    const tw = a.layer('wood', { outline: false, shading: false });
    for (let y = 2; y <= 10; y++) tw.set(5, y, SHADE).set(12, y, SHADE);
    return fin(a, 9, 11);
  },
  hose(v) {
    const a = new PixelArt(14, 12);
    const ramp = v ? 'petal_yellow' : 'leaf';
    a.layer(ramp).ellipse(7, 6, 5.5, 4.5);
    const ring = a.layer(ramp, { outline: false, shading: false });
    for (let y = 2; y <= 10; y++)
      for (let x = 1; x <= 13; x++) {
        const d = Math.hypot((x + 0.5 - 7) / 5.5, (y + 0.5 - 6) / 4.5);
        if (d < 1 && Math.abs(d - 0.7) < 0.09) ring.set(x, y, SHADE);
      }
    ring.ellipse(7, 6, 2, 1.4, OUTLINE);
    a.layer('petal_white').rect(11, 9, 2, 1);
    return fin(a, 7, 11);
  },
  thermo() {
    const a = new PixelArt(5, 14);
    a.layer('petal_white').rect(1, 1, 3, 10);
    const m = a.layer('petal_red', { outline: false, shading: false });
    for (let y = 5; y <= 10; y++) m.set(2, y, BASE);
    a.layer('petal_red').ellipse(2.5, 11.5, 1.6, 1.6);
    return fin(a, 2, 13);
  },
  stake(v) {
    const a = new PixelArt(5, 9);
    a.layer('wood', { outline: false, shading: false }).line(2, 4, 2, 8, SHADE);
    const l = a.layer(['cream', 'petal_white', 'gh_butternut'][v % 3]);
    l.rect(1, 1, 3, 3, LIGHT);
    l.set(2, 2, SHADE);
    return fin(a, 2, 8);
  },
};

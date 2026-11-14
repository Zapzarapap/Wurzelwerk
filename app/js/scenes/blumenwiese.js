// Blumenwiese – Szene (API: docs/SZENEN.md).
// Stand: Migration des v0.4-Looks (Wiese mit Hecke, Zaun, Pfad, Bank, Laterne;
// Blumen locker gestreut). Die Wiese wächst in Wiesenstücken (Abschnitte im
// Raster), jedes mit fest gestreuten Stellplätzen. Wird in Phase B überarbeitet.
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, C, Buf, fin, sprite } from '../scenekit/draw.js';
import { gridSequence, scatter } from '../scenekit/engine.js';
import { rng, noise, hashString, mulberry32 } from '../scenekit/rng.js';
import { PROP_SIZE } from '../scenekit/props.js';

const PATCH = 64;
const PAD = { top: 28, left: 4, right: 4, bottom: 4 };
const GRID = { cw: PATCH, ch: PATCH, aspect: 1.3, start: [2, 2] };
let seq = [];
const cellOf = (i) => {
  if (i >= seq.length) seq = gridSequence(Math.max(i + 1, seq.length * 2, 16), GRID);
  return seq[i];
};

const TILE = 32;
const ITEMS = [[0.42, 'tuft'], [0.14, 'stone'], [0.18, 'puff'], [0.26, 'flowers']];
const SIZE = { ...PROP_SIZE, puff: [9, 12], flowers: [9, 6] };

/** Deko-Kandidaten einer Kachel (Inhaltskoordinaten, unabhängig von Pflanzen). */
function tileDecor(tx, ty) {
  const rr = rng(`blumenwiese:tile:${tx}:${ty}`);
  const n = 2 + Math.floor(rr() * 3);
  const res = [];
  for (let k = 0; k < n; k++) {
    let u = rr() * ITEMS.reduce((a, [p]) => a + p, 0), part = ITEMS[0][1];
    for (const [p, name] of ITEMS) if ((u -= p) <= 0) { part = name; break; }
    const [w, h] = SIZE[part];
    const x = tx * TILE + Math.ceil(w / 2) + 1 + Math.floor(rr() * Math.max(1, TILE - w - 2));
    const y = ty * TILE + h + 1 + Math.floor(rr() * Math.max(1, TILE - h - 2));
    const v = Math.floor(rr() * 3), flip = rr() < 0.5;
    const box = { x0: x - w / 2 - 2, x1: x + w / 2 + 2, y0: y - h - 2, y1: y + 2 };
    if (res.some((o) => !(box.x1 < o.box.x0 || box.x0 > o.box.x1 || box.y1 < o.box.y0 || box.y0 > o.box.y1))) continue;
    res.push({ part, x, y, v, flip, box });
  }
  return res;
}

function blocksPlant(part, x, y, items) {
  const [w, h] = SIZE[part];
  return items.some((p) => Math.abs(p.x - x) < w / 2 + 10 && y - p.y > -5 && y - p.y < h + 5);
}

export default {
  id: 'blumenwiese',
  anchor: 'center',
  pad: PAD,
  minSections: 4,

  section(i) {
    const [c, r] = cellOf(i);
    const pts = scatter(PATCH, PATCH, rng(`blumenwiese:patch:${i}`), { n: 5, tries: 30 });
    return { rect: { x: c * PATCH, y: r * PATCH, w: PATCH, h: PATCH }, c, r, spots: pts.map((p) => ({ ...p, kind: 'meadow', ground: 'grass' })) };
  },

  pieces(scene) {
    const { W, H, ox, oy, items } = scene;
    const out = [];
    const tx0 = Math.floor(-ox / TILE), ty0 = Math.floor(-oy / TILE);
    for (let ty = ty0; (ty * TILE) + oy < H; ty++)
      for (let tx = tx0; (tx * TILE) + ox < W; tx++)
        for (const d of tileDecor(tx, ty)) {
          const x = d.x + ox, y = d.y + oy;
          if (d.box.x0 + ox < 2 || d.box.x1 + ox > W - 2 || d.box.y0 + oy < 30 || d.box.y1 + oy > H - 1) continue;
          if (blocksPlant(d.part, x, y, items)) continue;
          if (['tuft', 'stone'].includes(d.part)) out.push({ prop: d.part, v: d.part === 'tuft' ? [0, 1, 2][d.v] : d.v, x, y, z: y, flip: d.flip });
          else out.push({ kind: d.part, v: d.v, x, y, z: y, flip: d.flip });
        }
    return out;
  },

  sprite(p) {
    const b = BUILD[p.kind];
    return b ? sprite(`bw|${p.kind}|${p.v || 0}`, () => b(p.v || 0)) : null;
  },

  paint(scene) {
    const { W, H } = scene;
    const seed = hashString('blumenwiese');
    const rnd = mulberry32(seed ^ W ^ (H << 8));
    const b = new Buf(W, H);
    const halos = [], fireflies = [], critters = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x >> 1, y, seed), big = noise(x >> 3, y >> 3, seed + 5);
        let col = big > 0.5 ? C.leaf[2] : C.leaf[2].map((v, k) => Math.round((v + C.moss[2][k]) / 2));
        if (n > 0.86) col = C.leaf[3];
        else if (n < 0.06) col = C.leaf[1];
        b.set(x, y, col);
      }
    for (let i = 0; i < Math.round((W * H) / 90); i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      b.set(x, y, C.leaf[4]);
      b.set(x, y + 1, C.leaf[3]);
      if (rnd() < 0.5) b.set(x + 1, y + 1, C.leaf[1]);
    }
    const dots = [C.petal_white[3], C.petal_yellow[3], C.petal_pink[3], C.petal_blue[3]];
    for (let i = 0; i < Math.round((W * H) / 700); i++) b.set(Math.floor(rnd() * W), Math.floor(rnd() * H), dots[Math.floor(rnd() * dots.length)]);
    // Hecke ganz hinten, Pfad, Zaun
    for (let x = 0; x < W; x++) {
      const top = 3 + Math.round(Math.sin(x / 3.1 + seed) * 1.5 + Math.sin(x / 1.7) * 0.8);
      for (let y = 0; y < 9; y++) {
        if (y < top) b.set(x, y, noise(x >> 1, y, seed + 21) > 0.5 ? C.leaf_deep[2] : C.leaf_deep[1]);
        else if (y === top) b.set(x, y, C.leaf_deep[0]);
      }
    }
    for (let x = 0; x < W; x++) {
      const y0 = 16 + Math.round(Math.sin(x / 9 + seed) * 1.2), y1 = 23 + Math.round(Math.sin(x / 7 + 2) * 1.2);
      for (let y = y0; y <= y1; y++) {
        const n = noise(x, y, seed + 30);
        let col = n > 0.7 ? C.soil[4] : C.gh_pumpkin_beige[1];
        if (y === y0) col = C.leaf[1];
        else if (y === y1) col = C.leaf[3];
        else if (n < 0.06) col = C.stone[3];
        else if (n < 0.1) col = C.stone[1];
        b.set(x, y, col);
      }
    }
    b.art(fenceArt(W), 0, 1);
    const bx = 14 + Math.floor(rnd() * Math.max(1, W - 56));
    b.art(benchArt(), bx, 7);
    const posts = [];
    for (let x = 4; x < W - 2; x += 12) if (x + 3 < bx || x > bx + 28) posts.push(x);
    if (posts.length) {
      const px = posts[Math.floor(rnd() * posts.length)];
      b.art(lanternArt(), px - 2, 6);
      halos.push({ x: px + 1.5, y: 11, r: 22, rgb: [255, 200, 120] });
    }
    for (let i = 0; i < Math.max(6, Math.round((W * H) / 1800)); i++)
      fireflies.push({ x: Math.floor(rnd() * W), y: 6 + Math.floor(rnd() * (H - 10)), p: rnd() * Math.PI * 2 });
    const wings = [[C.petal_white[3], C.petal_white[2]], [C.petal_yellow[3], C.petal_yellow[2]], [C.petal_orange[3], C.petal_orange[1]], [C.petal_blue[3], C.petal_blue[2]]];
    for (let i = 0; i < Math.max(3, Math.round((W * H) / 7000)); i++) {
      const wcol = wings[Math.floor(rnd() * wings.length)];
      critters.push({ x: 16 + Math.floor(rnd() * (W - 32)), y: 34 + Math.floor(rnd() * (H - 44)), p: rnd() * Math.PI * 2, bee: rnd() < 0.4, rgb: wcol[0], rgb2: wcol[1] });
    }
    const { canvas, glow } = b.finish();
    return { canvas, glow, halos, fx: { fireflies, critters }, outside: [40, 70, 42] };
  },
};

// --- Teile -----------------------------------------------------------------------

const BUILD = {
  flowers(v) {
    const a = new PixelArt(9, 6);
    a.layer('stem', { outline: false, shading: false }).line(2, 5, 2, 2, SHADE).line(5, 5, 6, 1, BASE).line(4, 5, 4, 3, SHADE);
    const cols = [['petal_white', 'petal_yellow', 'petal_blue'], ['petal_yellow', 'petal_white', 'petal_pink'], ['petal_blue', 'petal_purple', 'petal_white']][v % 3];
    [[2, 1], [6, 0], [4, 2]].forEach(([x, y], i) => {
      a.layer(cols[i], { outline: false, shading: false }).set(x, y, LIGHT).set(x - 1, y, BASE).set(x + 1, y, SHADE).set(x, y - 1, HIGH).set(x, y + 1, BASE);
      a.layer('petal_yellow', { outline: false, shading: false }).set(x, y, cols[i] === 'petal_yellow' ? SHADE : HIGH);
    });
    return fin(a, 4, 5);
  },
  puff(v) {
    const a = new PixelArt(9, 12);
    a.layer('stem', { outline: false, shading: false }).line(4, 11, 4, 5, LIGHT);
    a.layer('leaf', { outline: false, shading: false }).line(1, 10, 3, 11, SHADE).line(7, 10, 5, 11, BASE).set(1, 10, LIGHT).set(7, 10, LIGHT);
    if (v === 1) {
      const f = a.layer('bw_dandelion');
      f.ellipse(4.5, 3.5, 2.4, 2);
      f.set(4, 3, HIGH);
    } else {
      const p = a.layer('petal_white', { outline: false, shading: false });
      for (let y = 0; y <= 6; y++)
        for (let x = 1; x <= 7; x++) {
          const d = Math.hypot(x + 0.5 - 4.5, y + 0.5 - 3.5);
          if (d <= 3.4) p.set(x, y, d > 2.6 ? ((x + y) % 2 ? HIGH : LIGHT) : d > 1.2 ? BASE : SHADE);
        }
    }
    return fin(a, 4, 11);
  },
};

function fenceArt(W) {
  const a = new PixelArt(W, 16);
  a.layer('wood').rect(0, 5, W, 2).rect(0, 10, W, 2);
  for (let x = 4; x < W - 2; x += 12) {
    const p = a.layer('wood');
    p.rect(x, 2, 3, 12);
    p.set(x + 1, 1, LIGHT);
  }
  return a;
}

function benchArt() {
  const a = new PixelArt(28, 14);
  const legs = a.layer('wood', { outline: false, shading: false });
  for (const x of [4, 5, 22, 23]) for (let y = 9; y <= 13; y++) legs.set(x, y, x % 2 ? OUTLINE : SHADE);
  a.layer('wood').rect(3, 1, 22, 2).rect(3, 4, 22, 2);
  a.layer('wood').rect(5, 1, 2, 7).rect(21, 1, 2, 7);
  const seat = a.layer('wood');
  seat.rect(1, 8, 26, 2);
  for (let x = 1; x < 27; x++) seat.set(x, 8, HIGH);
  return a;
}

function lanternArt() {
  const a = new PixelArt(7, 11);
  a.layer('dark', { outline: false, shading: false }).set(3, 0, HIGH).set(3, 1, HIGH);
  const f = a.layer('dark');
  f.rect(1, 3, 5, 6, HIGH);
  f.rect(2, 2, 3, 1, LIGHT);
  const g = a.layer('lamp', { outline: false, shading: false, glow: true });
  g.rect(2, 4, 3, 4, BASE);
  g.set(2, 4, HIGH);
  return a;
}

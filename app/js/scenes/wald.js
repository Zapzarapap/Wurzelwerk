// Wald – Szene (API: docs/SZENEN.md).
// Stand: Migration des v0.4-Looks (Waldboden, Baumreihe oben, Randbäume,
// Mondstrahlen, Glühmoos). Der Wald wächst in Waldstücken (Abschnitte im Raster)
// mit fest gestreuten Stellplätzen. Wird in Phase B grundlegend überarbeitet.
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, C, Buf, fin, sprite } from '../scenekit/draw.js';
import { gridSequence, scatter } from '../scenekit/engine.js';
import { rng, hashString, mulberry32, noise } from '../scenekit/rng.js';
import { PROP_SIZE } from '../scenekit/props.js';

const PATCH = 64;
const PAD = { top: 52, left: 8, right: 8, bottom: 4 };
const GRID = { cw: PATCH, ch: PATCH, aspect: 1.3, start: [2, 2] };
let seq = [];
const cellOf = (i) => {
  if (i >= seq.length) seq = gridSequence(Math.max(i + 1, seq.length * 2, 16), GRID);
  return seq[i];
};

const TILE = 32;
const ITEMS = [[0.18, 'leaves'], [0.18, 'mossrock'], [0.2, 'stump'], [0.1, 'log'], [0.03, 'puddle'], [0.16, 'tuft'], [0.1, 'stone']];
const SIZE = { ...PROP_SIZE, mossrock: [12, 8], stump: [14, 12], log: [22, 9], leaves: [12, 6], puddle: [22, 9], squirrel: [11, 12] };
const FLAT = new Set(['leaves', 'puddle']);

function tileDecor(tx, ty) {
  const rr = rng(`wald:tile:${tx}:${ty}`);
  const n = 1 + Math.floor(rr() * 3);
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
    if (part === 'puddle' && res.some((o) => o.part === 'puddle')) continue;
    res.push({ part, x, y, v, flip, box });
  }
  return res;
}

function blocksPlant(part, x, y, items) {
  const [w, h] = SIZE[part];
  for (const p of items) {
    const dx = Math.abs(p.x - x), dy = y - p.y;
    if (FLAT.has(part)) { if (dx < w / 2 + 5 && dy > -4 && dy < h + 3) return true; }
    else if (dx < w / 2 + 10 && dy > -5 && dy < h + 5) return true;
  }
  return false;
}

export default {
  id: 'wald',
  anchor: 'center',
  pad: PAD,
  minSections: 4,

  section(i) {
    const [c, r] = cellOf(i);
    const pts = scatter(PATCH, PATCH, rng(`wald:patch:${i}`), { n: 5, tries: 30 });
    return { rect: { x: c * PATCH, y: r * PATCH, w: PATCH, h: PATCH }, c, r, spots: pts.map((p) => ({ ...p, kind: 'forest', ground: 'moss' })) };
  },

  pieces(scene) {
    const { W, H, ox, oy, items } = scene;
    const out = [];
    for (let ty = Math.floor(-oy / TILE); ty * TILE + oy < H; ty++)
      for (let tx = Math.floor(-ox / TILE); tx * TILE + ox < W; tx++)
        for (const d of tileDecor(tx, ty)) {
          const x = d.x + ox, y = d.y + oy;
          if (d.box.x0 + ox < 2 || d.box.x1 + ox > W - 2 || d.box.y0 + oy < 46 || d.box.y1 + oy > H - 1) continue;
          if (blocksPlant(d.part, x, y, items)) continue;
          const z = FLAT.has(d.part) ? y - SIZE[d.part][1] - 6 : y;
          if (d.part === 'tuft') out.push({ prop: 'tuft', v: 3, x, y, z, flip: d.flip });
          else if (d.part === 'stone') out.push({ prop: 'stone', v: d.v, x, y, z, flip: d.flip });
          else out.push({ kind: d.part, v: d.v, x, y, z, flip: d.flip });
          if (d.part === 'stump' && rng(`sq:${d.x}:${d.y}`)() < 0.4) out.push({ kind: 'squirrel', x: x + (d.flip ? 2 : -2), y: y - 7, z: y + 0.05, flip: d.flip });
        }
    return out;
  },

  sprite(p) {
    const b = BUILD[p.kind];
    return b ? sprite(`wa|${p.kind}|${p.v || 0}`, () => b(p.v || 0)) : null;
  },

  paint(scene) {
    const { W, H } = scene;
    const seed = hashString('wald');
    const rnd = mulberry32(seed ^ W ^ (H << 8));
    const b = new Buf(W, H);
    const halos = [], fireflies = [], beams = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x >> 1, y >> 1, seed), n2 = noise(x, y, seed + 7);
        const moss = noise(x >> 4, y >> 4, seed + 3) > 0.45;
        let col = moss ? (n > 0.6 ? C.moss[2] : C.moss[1]) : n > 0.55 ? C.soil[3] : C.soil[2];
        if (n2 > 0.97) col = C.petal_orange[1];
        else if (n2 > 0.95) col = C.wood[3];
        b.set(x, y, col);
      }
    const trees = Math.max(2, Math.round(W / 34));
    for (let i = 0; i < trees; i++) {
      const tx = Math.round(((i + 0.5) * W) / trees + (rnd() - 0.5) * 10);
      const tw = 6 + Math.floor(rnd() * 3);
      for (let y = 8; y < 40; y++) for (let x = tx - tw / 2; x < tx + tw / 2; x++) {
        const xx = Math.round(x);
        b.set(xx, y, xx === Math.round(tx - tw / 2) ? C.wood[0] : xx < tx ? C.wood[2] : C.wood[1]);
      }
      b.rect(Math.round(tx - tw / 2) - 2, 38, tw + 4, 2, C.wood[1]);
    }
    for (let y = 0; y < 26; y++)
      for (let x = 0; x < W; x++) {
        const edge = 18 + Math.sin(x / 6 + seed) * 3 + Math.sin(x / 2.3) * 2;
        if (y < edge) {
          const n = noise(x >> 1, y >> 1, seed + 11);
          b.set(x, y, n > 0.7 ? C.leaf_deep[2] : n > 0.3 ? C.leaf_deep[1] : C.leaf_deep[0]);
        } else if (y < edge + 1) b.set(x, y, C.leaf_deep[0]);
      }
    for (let i = 0; i < Math.round((W * H) / 2600); i++) {
      const x = Math.floor(rnd() * W), y = 44 + Math.floor(rnd() * (H - 48));
      b.set(x, y, C.glow[2]);
      b.glow(x, y, C.glow[3], false);
      halos.push({ x, y, r: 6, rgb: [140, 240, 190] });
    }
    const leafCols = [C.petal_orange, C.bw_russet, C.petal_yellow, C.wood];
    for (let i = 0; i < Math.round((W * H) / 900); i++) {
      const cx = Math.floor(rnd() * W), cy = 42 + Math.floor(rnd() * (H - 44));
      const col = leafCols[Math.floor(rnd() * leafCols.length)];
      for (let k = 0; k < 5; k++) {
        const x = cx + Math.floor(rnd() * 6) - 3, y = cy + Math.floor(rnd() * 3) - 1;
        b.set(x, y, col[3]); b.set(x + 1, y, col[2]); b.set(x, y + 1, col[1]);
      }
    }
    for (const side of [0, 1])
      for (let k = 0, y = 78 + Math.floor(rnd() * 14); y < H + 10; k++, y += 44 + Math.floor(rnd() * 16)) {
        const x = side ? W - 16 + Math.floor(rnd() * 4) : -14 - Math.floor(rnd() * 4);
        b.art(treeArt((k + side) % 2), x, y - 58);
      }
    for (let i = 0; i < Math.max(5, Math.round((W * H) / 2600)); i++)
      fireflies.push({ x: 6 + Math.floor(rnd() * (W - 12)), y: 30 + Math.floor(rnd() * (H - 34)), p: rnd() * Math.PI * 2 });
    const nb = Math.max(2, Math.round(W / 70));
    for (let i = 0; i < nb; i++) {
      const x = Math.round(((i + 0.3 + rnd() * 0.4) * W) / nb), w = 6 + Math.floor(rnd() * 8), dx = Math.round(H * 0.35);
      beams.push({ pts: [[x, 18], [x + w, 18], [x + w + dx, H], [x + dx, H]], rgb: [170, 190, 255], a: 0.11, when: 'night' });
    }
    const { canvas, glow } = b.finish();
    return { canvas, glow, halos, beams, fx: { fireflies }, outside: [28, 36, 26] };
  },
};

// --- Teile -----------------------------------------------------------------------

const BUILD = {
  mossrock(v) {
    const a = new PixelArt(12, 8);
    a.layer('stone').ellipse(6, 4.5, 4.6 - (v % 2), 3);
    const m = a.layer('wa_moos', { outline: false });
    m.ellipse(5, 2.6, 3.2, 1.4);
    m.set(2, 4).set(3, 4);
    if (v === 2) {
      a.layer('wa_glow', { outline: false, shading: false, glow: true }).set(8, 2, LIGHT).set(9, 3, HIGH);
      return fin(a, 6, 7, { halo: { dx: 2, dy: -5, r: 7, rgb: [120, 240, 210] } });
    }
    return fin(a, 6, 7);
  },
  stump(v) {
    const a = new PixelArt(14, 12);
    a.layer('wood').rect(2, 4, 10, 6);
    const bark = a.layer('wood', { outline: false, shading: false });
    for (const x of [4, 7, 10]) for (let y = 5; y <= 9; y++) if ((x + y) % 3) bark.set(x, y, SHADE);
    a.layer('wood').rect(0, 9, 3, 2).rect(11, 9, 3, 2);
    a.layer('gh_pumpkin_beige').ellipse(7, 3.5, 5, 1.8);
    a.layer('gh_butternut', { outline: false, shading: false }).set(6, 3, SHADE).set(7, 3, SHADE).set(8, 4, BASE).set(5, 4, BASE);
    a.layer('wa_moos', { outline: false }).rect(2, 6, 2, 3);
    if (v === 2) {
      a.layer('wa_glow', { glow: true }).set(11, 6).set(12, 7);
      return fin(a, 7, 11, { halo: { dx: 4, dy: -5, r: 8, rgb: [120, 240, 210] } });
    }
    return fin(a, 7, 11);
  },
  log(v) {
    const a = new PixelArt(22, 9);
    a.layer('wood').rect(2, 2, 16, 5);
    const bark = a.layer('wood', { outline: false, shading: false });
    for (let x = 3; x < 18; x += 3) bark.set(x, 3 + (x % 2), SHADE).set(x + 1, 5, OUTLINE);
    a.layer('wood', { outline: false, shading: false }).line(7, 1, 5, 0, BASE);
    const end = a.layer('gh_pumpkin_beige');
    end.ellipse(19, 4.5, 2, 2.5);
    end.set(19, 4, SHADE);
    const moss = a.layer('wa_moos', { outline: false });
    moss.rect(4 + v * 2, 2, 5, 1);
    moss.set(5 + v * 2, 3);
    return fin(a, 11, 8);
  },
  leaves(v) {
    const a = new PixelArt(12, 6);
    const ramps = ['petal_orange', 'bw_russet', 'petal_yellow'];
    for (let i = 0; i < 9; i++) {
      const n = hashString(`lv${v}:${i}`) >>> 0;
      const x = 1 + (n >>> 3) % 9, y = 1 + (n >>> 7) % 4;
      a.layer(ramps[n % 3], { outline: false, shading: false }).set(x, y, LIGHT).set(x + 1, y, BASE).set(x, y + 1, SHADE);
    }
    return fin(a, 6, 5);
  },
  puddle(v) {
    const a = new PixelArt(22, 9);
    a.layer('soil', { outline: false, shading: false }).ellipse(11, 4.5, 10.5, 4, SHADE);
    const w = a.layer('bw_skyblue', { outline: false, shading: false });
    w.ellipse(11, 4.8, 9, 3, SHADE);
    for (let x = 4; x <= 17; x++) w.set(x, 2, OUTLINE);
    w.line(6, 5, 9, 5, LIGHT).line(13, 6, 15, 6, BASE);
    if (v) a.layer('stone').set(18, 6).set(19, 6);
    return fin(a, 11, 8);
  },
  squirrel() {
    const a = new PixelArt(11, 12);
    a.layer('petal_orange').rect(1, 3, 2, 6).rect(2, 1, 2, 3).set(4, 1).set(3, 9);
    a.layer('petal_orange', { outline: false, shading: false }).set(2, 1, HIGH).set(1, 4, LIGHT).set(1, 5, LIGHT);
    const body = a.layer('bw_russet');
    body.rect(5, 6, 3, 5);
    body.set(4, 8).set(4, 9).set(8, 10);
    const head = a.layer('bw_russet');
    head.rect(6, 3, 3, 3).set(9, 5, LIGHT);
    head.set(6, 2, BASE);
    a.layer('cream', { outline: false, shading: false }).set(7, 7, LIGHT).set(7, 8, LIGHT).set(7, 9, BASE);
    a.layer('dark', { outline: false, shading: false }).set(8, 4, BASE);
    return fin(a, 6, 11);
  },
};

function treeArt(v) {
  const a = new PixelArt(30, 60);
  a.layer('wood').rect(11, 18, 8, 40);
  const bark = a.layer('wood', { outline: false, shading: false });
  for (let y = 20; y < 57; y += 3) bark.set(13 + ((y * 7) % 4), y, SHADE).set(13 + ((y * 7) % 4), y + 1, SHADE);
  a.layer('wood').rect(8, 55, 4, 3).rect(18, 55, 4, 3).rect(6, 57, 3, 1).rect(21, 57, 3, 1);
  const ramp = v ? 'leaf' : 'leaf_deep';
  a.layer(ramp).ellipse(15, 11, 13, 10);
  a.layer(ramp).ellipse(8, 16, 7, 5).ellipse(22, 17, 7, 5);
  a.layer('wa_moos', { outline: false }).rect(11, 48, 2, 6);
  return a;
}

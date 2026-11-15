// Wald – Szene (API und Stilregeln: docs/SZENEN.md).
//
// Ein verwunschener, gemütlicher Wald in Draufsicht (3/4). Der Wald ist in
// Zellen (CW×CH) gegliedert; jede Zelle ist ein eigener „Ort“:
//   huette    – Waldhütte mit Laterne, Feuerstelle, Holzstapel, Pilzkorb (Start)
//   altbaum   – mächtiger alter Baum mit Wurzeln, Baumhöhle (Eule), schlafender Fuchs
//   lichtung  – sonnige Lichtung mit Baumstumpf, Blumen und Sonnen-/Mondstrahl
//   totholz   – umgestürzter, moosiger Baumstamm (Pflanzen wachsen darauf)
//   felsen    – bemooste Felsen (Pflanzen auf und zwischen den Steinen), Spinnennetz
//   hochsitz  – Hochsitz (Pflanze auf der Plattform), Eule nachts
//   rastplatz – Rastplatz mit Stammbank, Wegweiser, Pilzkorb
// Über alle Zellen hinweg laufen ein Bach (mit Ufer, Steinen, Trittsteinen) und
// Waldwege (mit Laub und Holzbrücken). Bäume stehen am oberen Rand jeder Zelle;
// ihr Kronendach liegt als Vordergrund über der Zelle darüber (Lichtflecken).
// Alles ist eine reine Funktion der Zellkoordinaten (c, r) → stabil beim Wachsen.
// Stellplätze liegen an Wurzeln, Ufern, Felsen, auf Stämmen und Lichtungen –
// nie unter Kronen oder hinter Stämmen/Objekten (wird beim Erzeugen geprüft).
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, C, Buf, rgbRamp, mix, fin, sprite } from '../scenekit/draw.js';
import { gridSequence, overlaps } from '../scenekit/engine.js';
import { rng, noise, pick, int } from '../scenekit/rng.js';

// --- Maße ---------------------------------------------------------------------
const CW = 128, CH = 104;
const PAD = { top: 46, left: 22, right: 22, bottom: 10 };
const GRID = { cw: CW, ch: CH, aspect: 1.25, start: [1, 2] };
const STRIP = [6, 30]; // Baumfüße am oberen Zellrand (lokal y)

// --- eigene Rampen [outline, shade, base, light, highlight] -----------------------
const H = {
  bark: ['#24180f', '#3c2a1c', '#56402c', '#70563c', '#8c7050'],
  oldbark: ['#1e1a14', '#36302a', '#4c463a', '#66604e', '#827c66'],
  darkwood: ['#2a1a14', '#432a1e', '#5e3c28', '#7a5236', '#966c48'],
  cut: ['#5e4026', '#a07448', '#c49a64', '#dcb880', '#f0d8a4'],
  roof: ['#1c2618', '#2e4024', '#44582e', '#5e7438', '#7e924a'],
  crown: ['#10241a', '#1a3824', '#26502e', '#386a36', '#568642'],
  crown2: ['#122218', '#1e3622', '#2e4e2a', '#446a34', '#668a44'],
  autumn: ['#3a2410', '#6a4218', '#94622a', '#b8843a', '#d8aa58'],
  wicker: ['#5a3c1c', '#9a6a34', '#c8944c', '#e0b46c', '#f2d494'],
  fox: ['#4a1e0e', '#8a3e18', '#c4642a', '#e08a44', '#f4b878'],
  hedge: ['#2a2018', '#4a3a2c', '#6a5640', '#8a7456', '#aa9472'],
  owl: ['#2c241e', '#54463a', '#7a6852', '#a08a6c', '#c4b090'],
  web: ['#6a7068', '#8a9088', '#a4aaa2', '#c0c6bc', '#e4ead8'],
  fern: ['#14301c', '#22492a', '#326636', '#4a8442', '#70a454'],
  water: ['#1a2c3a', '#24465a', '#2f5e70', '#4a8088', '#8cc0b8'],
};
const R = Object.fromEntries(Object.entries(H).map(([k, v]) => [k, rgbRamp(v)]));
const FLOOR = {
  moss: rgbRamp(['#1a2a1c', '#283e26', '#34502e', '#446438', '#587a42']),
  litter: rgbRamp(['#2a1e16', '#413024', '#54402e', '#6a5238', '#806646']),
  grass: rgbRamp(['#22381e', '#324e26', '#40622e', '#517436', '#6a8a42']),
  path: rgbRamp(['#3a2a1e', '#56402e', '#6c5238', '#846646', '#9e7e58']),
  bank: rgbRamp(['#1c1612', '#2c221a', '#3a2e22', '#4a3c2c', '#5c4c38']),
};
const WATER_EDGE = mix(R.water[1], R.water[0], 0.4);
const LEAF_COLS = [C.petal_orange[1], C.bw_russet[2], C.petal_yellow[1], C.petal_orange[2], C.bw_russet[3]];

// --- globale Geometrie (Inhaltskoordinaten) --------------------------------------
const STREAM_BASE = CW + 4, STREAM_EVERY = 5 * CW;
const PATH_Y = 80, PATH_HW = 4;

function streamK(x) { return Math.max(0, Math.round((x - STREAM_BASE) / STREAM_EVERY)); }
function streamX(k, y) {
  return STREAM_BASE + k * STREAM_EVERY + Math.round(15 * Math.sin(y / 43 + 0.6 + k * 2.3) + 6 * Math.sin(y / 17 + 2.1 + k));
}
const streamHW = (y) => 6 + Math.round(1.4 * Math.sin(y / 29));
/** Abstand zur Bachmitte und halbe Breite an (x, y). */
function stream(x, y) {
  const k = streamK(x), sx = streamX(k, y);
  return { d: Math.abs(x - sx), dx: x - sx, hw: streamHW(y), k, sx };
}
const hasPath = (r) => ((r % 2) + 2) % 2 === 0;
const rowOf = (y) => Math.floor(y / CH);
function pathY(x, r) {
  return r * CH + PATH_Y + Math.round(9 * Math.sin(x / 53 + r * 1.3) + 3 * Math.sin(x / 19 + r));
}
function pathDist(x, y) {
  const r = rowOf(y);
  return hasPath(r) ? Math.abs(y - pathY(x, r)) : Infinity;
}
/** Holzbrücke, wo der Weg (Reihe r) den Bach k quert. */
function bridgeAt(k, r) {
  const sx = streamX(k, r * CH + PATH_Y), by = pathY(sx, r);
  let x0 = Infinity, x1 = -Infinity;
  for (let y = by - 6; y <= by + 6; y++) {
    const c = streamX(k, y), hw = streamHW(y);
    x0 = Math.min(x0, c - hw); x1 = Math.max(x1, c + hw);
  }
  return { x0: x0 - 5, x1: x1 + 5, y: by, box: { x0: x0 - 6, x1: x1 + 6, y0: by - 13, y1: by + 5 }, z: by + 5 };
}
function bridgesNear(x0, x1, y0, y1) {
  const out = [];
  for (let k = streamK(x0); k <= streamK(x1); k++)
    for (let r = rowOf(y0) - 1; r <= rowOf(y1) + 1; r++) if (hasPath(r)) out.push(bridgeAt(k, r));
  return out;
}

// --- Zellen: Typ, Bäume, Objekte, Stellplätze (rein, gecacht) ------------------------
const TYPES = ['hochsitz', 'altbaum', 'totholz', 'felsen', 'lichtung'];
export function cellType(c, r) {
  if (c === 0 && r === 0) return 'huette';
  const t = TYPES[(((2 * c + 4 * r) % 5) + 5) % 5];
  if (t === 'hochsitz' && ((c + r) % 2 + 2) % 2) return 'rastplatz';
  return t;
}

const TREE_SIZES = [{ rx: 15, ry: 12 }, { rx: 18, ry: 14 }, { rx: 30, ry: 21 }];
const crownDims = (size) => { const { rx, ry } = TREE_SIZES[size]; return { rx, ry, W: 2 * rx + 5, H: 2 * ry + 5 }; };

const treeCache = new Map();
/** Bäume einer Zelle (lokal): {x, base, w, h, size, v, giant, cb (Kronenunterkante)} */
export function treesOf(c, r) {
  const key = `${c},${r}`;
  if (treeCache.has(key)) return treeCache.get(key);
  const type = cellType(c, r);
  const rr = rng(`wald:trees:${c}:${r}`);
  const out = [];
  const X0 = c * CW, Y0 = r * CH;
  const wet = (x, w, base) => {
    for (const y of [base - 30, base - 15, base, base + 4]) {
      const s = stream(X0 + x, Y0 + y);
      if (s.d < s.hw + w / 2 + 5) return true;
    }
    return false;
  };
  if (type === 'altbaum') {
    let x = 60 + int(rr, 0, 10);
    for (let k = 0; k < 6 && wet(x, 64, 62); k++) x += x < 64 ? -10 : 10;
    out.push({ x: Math.min(CW - 34, Math.max(34, x)), base: 62, w: 22, h: 34, size: 2, v: int(rr, 0, 3), giant: true });
  } else {
    const n = type === 'lichtung' ? (rr() < 0.5 ? 1 : 0) : type === 'huette' ? 1 : 1 + (rr() < 0.55 ? 1 : 0);
    for (let k = 0, tries = 0; k < n && tries < 20; tries++) {
      const size = rr() < 0.45 ? 1 : 0;
      const { rx } = TREE_SIZES[size];
      let x = int(rr, rx + 3, CW - rx - 3);
      if (type === 'lichtung') x = rr() < 0.5 ? rx + 3 + int(rr, 0, 6) : CW - rx - 3 - int(rr, 0, 6);
      if (type === 'huette') x = int(rr, 106, CW - rx - 3);
      const base = int(rr, STRIP[0], STRIP[1]);
      const w = size ? 11 + int(rr, 0, 2) : 8 + int(rr, 0, 2);
      if (wet(x, w, base)) continue;
      if (out.some((o) => Math.abs(o.x - x) < 26)) continue;
      out.push({ x, base, w, h: 26 + int(rr, 0, 6), size, v: int(rr, 0, 7), giant: false });
      k++;
    }
  }
  for (const t of out) t.cb = t.base - t.h + (t.giant ? 8 : 5);
  treeCache.set(key, out);
  return out;
}

/** Kronen-Box (lokal zur Zelle des Baums). */
function crownBox(t) {
  const d = crownDims(t.size);
  return { x0: t.x - d.rx - 2, x1: t.x + d.rx + 2, y0: t.cb - d.H + 1, y1: t.cb };
}

// Sprite-Maße [w, h, ax, ay] der Objekte (für Boxen und Sprites)
const SZ = {
  hut: [50, 48, 25, 47], fire: [22, 15, 11, 13], bench: [24, 9, 12, 8], woodpile: [20, 16, 10, 15],
  basket: [14, 11, 7, 10], log: [58, 17, 29, 16], stump: [18, 14, 9, 13], boulder0: [26, 18, 13, 17],
  boulder1: [20, 14, 10, 13], boulder2: [13, 9, 6, 8], hochsitz: [28, 58, 14, 57], wetstone: [16, 8, 8, 7],
  sign: [14, 20, 6, 19],
};
const objBox = (kind, x, y) => {
  const [w, h, ax, ay] = SZ[kind];
  return { x0: x - ax, x1: x - ax + w - 1, y0: y - ay, y1: y - ay + h - 1 };
};

const RAISABLE = new Set(['log', 'stump', 'boulder0', 'boulder1', 'boulder2', 'hochsitz', 'wetstone', 'hut']);
const cellCache = new Map();
/**
 * Alles Statische einer Zelle (lokal):
 *  { type, trees, objs: [{kind, v, x, y, z, flip}], occ: [{box, z}], feet: [box], spots, anchors }
 */
export function cellData(c, r) {
  const key = `${c},${r}`;
  if (cellCache.has(key)) return cellCache.get(key);
  const type = cellType(c, r);
  const X0 = c * CW, Y0 = r * CH;
  const trees = treesOf(c, r);
  const below = treesOf(c, r + 1).map((t) => ({ ...t, base: t.base + CH, cb: t.cb + CH }));
  const occ = [], feet = [], anchors = [], keep = [];
  for (const t of [...trees, ...below]) {
    occ.push({ box: crownBox(t), z: Infinity });
    occ.push({ box: { x0: t.x - t.w / 2 - 1, x1: t.x + t.w / 2 + 1, y0: t.base - t.h, y1: t.base - 1 }, z: t.base });
    feet.push({ x0: t.x - t.w / 2 - 3, x1: t.x + t.w / 2 + 3, y0: t.base - 5, y1: t.base + (t.giant ? 5 : 3) });
    if (t.base < CH) anchors.push({ x: t.x, y: t.base + 2, kind: 'root' });
  }
  // Brücken in/nahe der Zelle
  for (const b of bridgesNear(X0 - 40, X0 + CW + 40, Y0 - 20, Y0 + CH + 20)) {
    const bx = { x0: b.box.x0 - X0, x1: b.box.x1 - X0, y0: b.box.y0 - Y0, y1: b.box.y1 - Y0 };
    occ.push({ box: bx, z: b.z - Y0 });
    feet.push(bx);
  }
  const water = (x, y, m = 2) => { const s = stream(X0 + x, Y0 + y); return s.d <= s.hw + m; };
  const onPath = (x, y, m = 1) => pathDist(X0 + x, Y0 + y) <= PATH_HW + m;
  const boxFree = (b, z, opts = {}) => {
    const path = opts.path ?? true;
    if (b.x0 < 2 || b.x1 > CW - 2 || b.y0 < 1 || b.y1 > CH - 2) return false;
    for (const o of occ) if (overlaps(o.box, b) && (o.z === Infinity || o.z > z || overlaps(o.box, { ...b, y0: b.y1 - 4 }))) return false;
    for (const f of feet) if (overlaps(f, b)) return false;
    for (let x = b.x0; x <= b.x1; x += 2) {
      if (!opts.wet && (water(x, b.y1, 2) || water(x, b.y1 - 4, 1))) return false;
      if (path && (onPath(x, b.y1, 1) || onPath(x, b.y1 - 3, 0))) return false;
    }
    return true;
  };
  const objs = [];
  const raised = [];
  const rr = rng(`wald:objs:${c}:${r}`);
  /** Objekt an (x, y) versuchen; bei Kollision um ±dx/±dy verschieben. */
  const place = (kind, x, y, v = 0, opts = {}) => {
    const tries = [[0, 0], [8, 0], [-8, 0], [0, 6], [0, -6], [14, 4], [-14, 4], [16, -6], [-16, -6], [22, 0], [-22, 0], [0, 12], [0, -12]];
    for (const [dx, dy] of tries) {
      const px = x + dx, py = y + dy;
      const b = objBox(kind, px, py);
      if (!boxFree(b, py, opts)) continue;
      const o = { kind, v, x: px, y: py, z: py, flip: !!opts.flip, box: b };
      objs.push(o);
      occ.push({ box: b, z: py });
      feet.push({ x0: b.x0 + 1, x1: b.x1 - 1, y0: b.y0 + 2, y1: b.y1 + 2 });
      anchors.push({ x: px, y: py, kind: opts.anchor || 'floor' });
      if (kind === 'fire' || kind === 'sign') keep.push({ x0: px - 2, x1: px + 2, y0: py - Math.round(SZ[kind][1] * 0.6), y1: py - 3 });
      return o;
    }
    return null;
  };
  const flip = rr() < 0.5;
  const fx = (x) => (flip ? CW - x : x);
  if (type === 'huette') {
    const hut = place('hut', 31, 49, 0, { path: false });
    if (hut) keep.push({ x0: hut.x - 14, x1: hut.x + 17, y0: hut.y - 22, y1: hut.y - 11 });
    place('woodpile', 66, 47);
    place('bench', 86, 55);
    place('fire', 86, 67, 0, { path: false });
    place('basket', 112, 54);
  } else if (type === 'lichtung') {
    const s = place('stump', fx(64 + int(rr, -14, 14)), 52 + int(rr, -6, 8), int(rr, 0, 2));
    if (s) raised.push({ x: s.x, y: s.y - 8, z: s.y + 0.5, kind: 'stump' });
  } else if (type === 'totholz') {
    const L = place('log', fx(62 + int(rr, -10, 10)), 56 + int(rr, -6, 6), 0, { flip });
    if (L) {
      raised.push({ x: L.x - 12, y: L.y - 9, z: L.y + 0.5, kind: 'log' });
      raised.push({ x: L.x + 9, y: L.y - 9, z: L.y + 0.4, kind: 'log' });
    }
    const st = place('stump', fx(rr() < 0.5 ? 22 : 104), 96, 1);
    if (st) raised.push({ x: st.x, y: st.y - 8, z: st.y + 0.5, kind: 'stump' });
  } else if (type === 'felsen') {
    const a = place('boulder0', fx(44 + int(rr, -8, 8)), 50 + int(rr, -4, 6), int(rr, 0, 2));
    const b = place('boulder1', fx(86 + int(rr, -8, 8)), 64 + int(rr, -4, 6), int(rr, 0, 2));
    place('boulder2', fx(64 + int(rr, -6, 6)), 96, int(rr, 0, 2));
    if (a) raised.push({ x: a.x - 1, y: a.y - 12, z: a.y + 0.5, kind: 'rock' });
    if (b) raised.push({ x: b.x, y: b.y - 9, z: b.y + 0.5, kind: 'rock' });
  } else if (type === 'hochsitz') {
    const h = place('hochsitz', fx(70 + int(rr, -12, 12)), 70 + int(rr, -4, 4), 0, { flip });
    if (h) raised.push({ x: h.x, y: h.y - 31, z: h.y + 0.5, kind: 'stand' });
    place('woodpile', fx(28), 98, 1);
  } else if (type === 'rastplatz') {
    place('bench', fx(56 + int(rr, -8, 8)), 56, 1);
    place('sign', fx(100), 70 + int(rr, -2, 2));
    place('basket', fx(30), 96, 1);
  } else if (type === 'altbaum') {
    if (rr() < 0.6) place('boulder2', fx(rr() < 0.5 ? 18 : 110), 96, int(rr, 0, 2));
  }
  // Trittstein im Bach (Pflanze wächst auf dem Stein)
  for (let k = 0; k < 4; k++) {
    const y = int(rr, 36, CH - 6);
    const s = stream(X0 + 64, Y0 + y), sx = streamX(s.k, Y0 + y) - X0;
    if (sx < 14 || sx > CW - 14) continue;
    if (pathDist(X0 + sx, Y0 + y) < 22) continue;
    const st = place('wetstone', sx + int(rr, -2, 2), y, 0, { path: true, wet: true });
    if (st) { raised.push({ x: st.x, y: st.y - 3, z: st.y + 0.5, kind: 'stone' }); break; }
  }
  // Ufer als Anker (Pflanzen gruppieren sich am Bach)
  for (let y = 26; y < CH; y += 12) {
    const s = stream(X0 + 64, Y0 + y), sx = streamX(s.k, Y0 + y) - X0, hw = streamHW(Y0 + y);
    for (const ex of [sx - hw - 6, sx + hw + 6]) if (ex > 0 && ex < CW) anchors.push({ x: ex, y, kind: 'bank' });
  }
  const d = { type, trees, objs, occ, feet, anchors, keep, X0, Y0 };
  d.spots = makeSpots(c, r, d, raised, water, onPath);
  cellCache.set(key, d);
  return d;
}

const TARGET = { huette: 8, lichtung: 9, altbaum: 7, totholz: 8, felsen: 8, hochsitz: 7, rastplatz: 8 };
const plantBoxAt = (x, y) => ({ x0: x - 13, x1: x + 13, y0: y - 29, y1: y + 1 });

function makeSpots(c, r, d, raised, water, onPath) {
  const rr = rng(`wald:spots:${c}:${r}`);
  const spots = [];
  const clash = (x, y) => spots.some((p) => Math.abs(p.x - x) <= 17 && Math.abs(p.y - y) <= 22);
  const visible = (x, y, z) => {
    const pb = plantBoxAt(x, y);
    for (const o of d.occ) if (o.z > z && overlaps(o.box, pb)) return false;
    return !d.keep.some((k) => overlaps(k, pb));
  };
  const inside = (x, y) => x >= 10 && x <= CW - 10 && y >= 24 && y <= CH - 2;
  for (const s of raised) {
    if (!inside(s.x, s.y) || clash(s.x, s.y) || !visible(s.x, s.y, s.z)) continue;
    spots.push({ ...s });
  }
  const groundOk = (x, y) => {
    if (!inside(x, y) || clash(x, y)) return false;
    if (water(x, y, 5) || onPath(x, y, 2)) return false;
    const fb = { x0: x - 5, x1: x + 5, y0: y - 2, y1: y + 1 };
    if (d.feet.some((f) => overlaps(f, fb))) return false;
    return visible(x, y, y);
  };
  const target = TARGET[d.type];
  for (let k = 0; k < target * 2 && spots.length < target; k++) {
    let best = null, bs = -Infinity;
    for (let t = 0; t < 48; t++) {
      const x = int(rr, 10, CW - 10), y = int(rr, 24, CH - 2);
      const jit = rr();
      if (!groundOk(x, y)) continue;
      let dm = 46;
      for (const p of spots) dm = Math.min(dm, Math.hypot(p.x - x, (p.y - y) * 1.2));
      let da = 60;
      for (const a of d.anchors) da = Math.min(da, Math.hypot(a.x - x, a.y - y));
      const pd = pathDist(d.X0 + x, d.Y0 + y);
      const sc = dm - 0.45 * da + (pd < 12 ? 6 : 0) + jit * 8;
      if (sc > bs) { bs = sc; best = { x, y }; }
    }
    if (!best) break;
    const { x, y } = best;
    let kind = d.type === 'lichtung' ? 'clearing' : 'floor';
    const s = stream(d.X0 + x, d.Y0 + y);
    let near = null, nd = 1e9;
    for (const a of d.anchors) { const dd = Math.hypot(a.x - x, a.y - y); if (dd < nd) { nd = dd; near = a; } }
    if (s.d < s.hw + 14) kind = 'bank';
    else if (near && near.kind === 'root' && nd < 30) kind = 'root';
    else if (pathDist(d.X0 + x, d.Y0 + y) < 12) kind = 'path';
    spots.push({ x, y, kind, ground: kind === 'bank' ? 'bank' : 'moss' });
  }
  return spots;
}

let seq = [];
const cellOf = (i) => {
  if (i >= seq.length) seq = gridSequence(Math.max(i + 1, seq.length * 2, 16), GRID);
  return seq[i];
};

// --- Deko (rein) ---------------------------------------------------------------------

const FREE = {
  root: [0.85, ['minimush', 'glowmush', 'fern', 'minimush', 'acorns', 'glowmush']],
  bank: [0.75, ['fern', 'pebbles', 'fern', 'frog', 'glowmush']],
  clearing: [0.8, ['flowers', 'tuft', 'flowers', 'leafpile', 'flowers']],
  path: [0.6, ['leafpile', 'pinecone', 'flowers', 'tuft']],
  floor: [0.7, ['leafpile', 'minimush', 'pinecone', 'fern', 'twig', 'tuft', 'flowers']],
  log: [0.75, ['minimush', 'pinecone', 'mossclump']],
  rock: [0.8, ['mossclump', 'pinecone', 'glowmush']],
  stump: [1, ['squirrel', 'minimush', 'squirrel']],
  stone: [0.5, ['frog']],
  stand: [1, ['owl']],
};
const DSZ = {
  minimush: [9, 7], glowmush: [9, 8], fern: [15, 11], acorns: [8, 4], pebbles: [11, 5], frog: [8, 6],
  flowers: [11, 8], tuft: [11, 10], leafpile: [12, 6], pinecone: [5, 6], twig: [13, 5], mossclump: [10, 5],
  squirrel: [11, 12], owl: [10, 13], hedgehog: [12, 8], fox: [19, 10], web: [13, 13], mushring: [16, 7],
};
const dbox = (name, x, y, pad = 1) => {
  const [w, h] = DSZ[name] || [10, 10];
  return { x0: x - w / 2 - pad, x1: x + w / 2 + pad, y0: y - h - pad, y1: y + pad };
};

function decorate(s, out) {
  const d = cellData(s.c, s.r);
  const X = s.rect.x, Y = s.rect.y;
  // Objekte
  for (const o of d.objs) out.push({ kind: o.kind, v: o.v, x: X + o.x, y: Y + o.y, z: Y + o.z, flip: o.flip });
  // Eule in der Baumhöhle des alten Baums
  for (const t of d.trees) if (t.giant) out.push({ kind: 'owlhole', x: X + t.x - 3, y: Y + t.base - 18, z: Y + t.base - 0.5, flip: false });
  // Deko auf Stellplätzen (verschwindet, wenn dort etwas wächst)
  let animal = false;
  s.spots.forEach((sp) => {
    const r2 = rng(`wald:free:${sp.key}`);
    const [p, list] = FREE[sp.kind] || FREE.floor;
    if (r2() > p) return;
    let name = pick(r2, list);
    if (!animal && d.type === 'altbaum' && (sp.kind === 'root' || sp.kind === 'floor')) { name = 'fox'; animal = true; }
    else if (!animal && d.type === 'totholz' && sp.kind !== 'log' && sp.kind !== 'stump' && sp.kind !== 'stone') { name = 'hedgehog'; animal = true; }
    const x = sp.x, y = sp.y;
    out.push({ kind: name, v: Math.floor(r2() * 3), x, y, z: sp.z, flip: r2() < 0.5, spot: sp.key, yield: true, box: dbox(name, x, y) });
  });
  // Lose Deko (Laub, Farne am Ufer, Pilze, Spinnennetz) – weicht Pflanzen
  const rr = rng(`wald:deco:${s.c}:${s.r}`);
  const placed = [];
  const n = 12;
  for (let k = 0; k < n * 3 && placed.length < n; k++) {
    const x = int(rr, 6, CW - 6), y = int(rr, 8, CH - 2);
    const roll = rr();
    const st = stream(d.X0 + x, d.Y0 + y);
    const pd = pathDist(d.X0 + x, d.Y0 + y);
    let name;
    if (st.d <= st.hw + 1) continue;
    if (st.d < st.hw + 7) name = roll < 0.55 ? 'fern' : roll < 0.8 ? 'pebbles' : 'tuft';
    else if (pd <= PATH_HW + 1) name = roll < 0.75 ? 'leafpile' : 'pinecone';
    else name = pick(rr, ['leafpile', 'leafpile', 'twig', 'fern', 'tuft', 'minimush', 'pebbles', 'fern', 'leafpile', d.type === 'lichtung' ? 'flowers' : 'fern', d.type === 'lichtung' ? 'flowers' : 'leafpile']);
    const b = dbox(name, x, y, 2);
    if (b.x0 < 1 || b.x1 > CW - 1 || b.y0 < 0) continue;
    if (d.occ.some((o) => overlaps(o.box, b))) continue;
    if (d.feet.some((f) => overlaps(f, b))) continue;
    if (s.spots.some((sp) => overlaps({ x0: sp.lx - 9, x1: sp.lx + 9, y0: sp.ly - 12, y1: sp.ly + 3 }, b))) continue;
    if (placed.some((q) => overlaps(q, b))) continue;
    placed.push(b);
    out.push({ kind: name, v: int(rr, 0, 2), x: X + x, y: Y + y, z: Y + y - 0.3, flip: rr() < 0.5, yield: true, box: { x0: X + b.x0, x1: X + b.x1, y0: Y + b.y0, y1: Y + b.y1 } });
  }
  // Spinnennetz mit Tau zwischen Wurzeln / am Felsen
  if (d.type === 'felsen' || d.type === 'altbaum' || rr() < 0.3) {
    for (let k = 0; k < 10; k++) {
      const x = int(rr, 10, CW - 10), y = int(rr, 30, CH - 4);
      const b = dbox('web', x, y, 1);
      if (d.occ.some((o) => overlaps(o.box, b)) || d.feet.some((f) => overlaps(f, b))) continue;
      const st = stream(d.X0 + x, d.Y0 + y);
      if (st.d < st.hw + 3 || pathDist(d.X0 + x, d.Y0 + y) < PATH_HW + 2) continue;
      if (s.spots.some((sp) => overlaps({ x0: sp.lx - 9, x1: sp.lx + 9, y0: sp.ly - 12, y1: sp.ly + 3 }, b))) continue;
      if (placed.some((q) => overlaps(q, b))) continue;
      out.push({ kind: 'web', v: 0, x: X + x, y: Y + y, z: Y + y - 0.3, flip: rr() < 0.5, yield: true, box: { x0: X + b.x0, x1: X + b.x1, y0: Y + b.y0, y1: Y + b.y1 } });
      break;
    }
  }
}

// --- Modul ---------------------------------------------------------------------------

export default {
  id: 'wald',
  anchor: 'center',
  pad: PAD,
  minSections: 2,
  maxFill: 24,

  section(i) {
    const [c, r] = cellOf(i);
    const d = cellData(c, r);
    return { rect: { x: c * CW, y: r * CH, w: CW, h: CH }, c, r, type: d.type, spots: d.spots.map((s) => ({ ...s })) };
  },

  pieces(scene) {
    const out = [];
    for (const s of scene.sections) decorate(s, out);
    return out;
  },

  front(scene) {
    const out = [];
    const { W, H, ox, oy } = scene;
    const c0 = Math.floor(-ox / CW) - 1, c1 = Math.floor((W - ox) / CW) + 1;
    const r0 = Math.floor(-oy / CH) - 1, r1 = Math.floor((H - oy) / CH) + 2;
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        for (const t of treesOf(c, r)) {
          const x = c * CW + t.x + ox, y = r * CH + t.cb + oy;
          const dm = crownDims(t.size);
          if (x + dm.rx < -4 || x - dm.rx > W + 4 || y < -4 || y - dm.H > H + 4) continue;
          out.push({ kind: 'crown', v: t.size * 10 + (t.v % 8), x, y, z: 0, flip: t.v % 2 === 1 });
        }
    return out;
  },

  sprite(p) {
    const b = BUILD[p.kind];
    return b ? sprite(`wa|${p.kind}|${p.v || 0}`, () => b(p.v || 0)) : null;
  },

  paint(scene) {
    return paintForest(scene);
  },
};

// --- Hintergrund -------------------------------------------------------------------

function vnoise(x, y, s, seed) {
  const fx = x / s, fy = y / s, x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = noise(x0, y0, seed), b = noise(x0 + 1, y0, seed), c = noise(x0, y0 + 1, seed), d = noise(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Lichtung (helleres Gras) – Ellipse pro Zelltyp, lokal. */
function clearingOf(c, r) {
  const t = cellType(c, r);
  if (t === 'lichtung') return { x: 64, y: 58, rx: 50, ry: 36 };
  if (t === 'huette') return { x: 70, y: 66, rx: 52, ry: 28 };
  if (t === 'rastplatz') return { x: 60, y: 62, rx: 38, ry: 24 };
  return null;
}

/** Gitterwerte von vnoise zeilenweise merken (gleiche Formel, nur weniger noise()-Aufrufe). */
function vrow(s, seed, y) {
  const fy = y / s, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
  let lx = NaN, a = 0, b = 0, c = 0, d = 0;
  return (x) => {
    const fx = x / s, x0 = Math.floor(fx);
    if (x0 !== lx) { lx = x0; a = noise(x0, y0, seed); b = noise(x0 + 1, y0, seed); c = noise(x0, y0 + 1, seed); d = noise(x0 + 1, y0 + 1, seed); }
    const tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

const FT = 64; // Kachelgröße Boden (Inhaltskoordinaten)
const floorCache = new Map();
const toneCache = new Map();
const tones = (ramp) => {
  let t = toneCache.get(ramp);
  if (!t) toneCache.set(ramp, (t = [mix(ramp[2], ramp[1], 0.32), mix(ramp[2], ramp[3], 0.32)]));
  return t;
};

/**
 * Waldboden einer FT×FT-Kachel (Inhaltskoordinaten, RGBA): Moos/Laub, Lichtungen,
 * Weg, Bach, Sonnenflecken. Lichtungen und Flecken werden pro Zelle in fester
 * Reihenfolge (Reihe, Spalte) geprüft; erster Treffer gewinnt.
 */
function floorTile(tx, ty) {
  const key = `${tx},${ty}`;
  let t = floorCache.get(key);
  if (t) return t;
  if (floorCache.size > 700) floorCache.clear(); // ≈ 11 MB
  t = new Uint8ClampedArray(FT * FT * 4);
  const X0 = tx * FT, Y0 = ty * FT;
  // Zellen um die Kachel (Ellipsen reichen höchstens in die Nachbarzelle)
  const clear = [], flecks = [];
  for (let r = Math.floor(Y0 / CH) - 1; r <= Math.floor((Y0 + FT - 1) / CH) + 1; r++)
    for (let c = Math.floor(X0 / CW) - 1; c <= Math.floor((X0 + FT - 1) / CW) + 1; c++) {
      const cl = clearingOf(c, r);
      if (cl) clear.push({ ...cl, x: c * CW + cl.x, y: r * CH + cl.y });
      const rr = rng(`wald:fleck:${c}:${r}`);
      for (let k = 0; k < 5; k++) flecks.push({ x: c * CW + int(rr, 0, CW), y: r * CH + int(rr, 0, CH), rx: 4 + int(rr, 0, 7), ry: 2 + int(rr, 0, 3) });
    }
  // Pro 16er-Feld nur die Ellipsen, die es berühren können (Reihenfolge bleibt).
  // Lichtungsrand: Rauschen ±0.25 → Radius·√1.25.
  const BIN = 16, NB = FT / BIN;
  const binOf = (list, grow) => {
    const bins = Array.from({ length: NB * NB }, () => []);
    for (const e of list) {
      const ex = e.rx * grow + 1, ey = e.ry * grow + 1;
      const bx0 = Math.max(0, Math.floor((e.x - X0 - ex) / BIN)), bx1 = Math.min(NB - 1, Math.floor((e.x - X0 + ex) / BIN));
      const by0 = Math.max(0, Math.floor((e.y - Y0 - ey) / BIN)), by1 = Math.min(NB - 1, Math.floor((e.y - Y0 + ey) / BIN));
      for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) bins[by * NB + bx].push(e);
    }
    return bins;
  };
  const clearBins = binOf(clear, Math.sqrt(1.25)), fleckBins = binOf(flecks, 1);
  // Weg/Bach-Geometrie pro Spalte bzw. Zeile (gleiche Formeln wie pathDist/stream)
  const kOf = new Int32Array(FT);
  for (let lx = 0; lx < FT; lx++) kOf[lx] = streamK(X0 + lx);
  const kMin = kOf[0], kMax = kOf[FT - 1];
  const sxOf = new Float64Array(kMax - kMin + 1);
  const pyOf = new Float64Array(FT);
  let pyRow = null;
  for (let ly = 0; ly < FT; ly++) {
    const cy = Y0 + ly;
    const brow = (ly >> 4) * NB;
    const prow = rowOf(cy), onPathRow = hasPath(prow);
    if (onPathRow && pyRow !== prow) { for (let lx = 0; lx < FT; lx++) pyOf[lx] = pathY(X0 + lx, prow); pyRow = prow; }
    for (let k = kMin; k <= kMax; k++) sxOf[k - kMin] = streamX(k, cy);
    const hw = streamHW(cy);
    const v22 = vrow(22, 11, cy), v7 = vrow(7, 12, cy), v6 = vrow(6, 15, cy);
    for (let lx = 0; lx < FT; lx++) {
      const cx = X0 + lx;
      const bi = brow + (lx >> 4);
      const m = v22(cx) + (v7(cx) - 0.5) * 0.35;
      const f = noise(cx >> 1, cy >> 1, 13);
      let ramp;
      if (m > 0.5) ramp = FLOOR.moss;
      else if (m < 0.38) ramp = FLOOR.litter;
      else ramp = noise(cx, cy, 14) < (m - 0.38) / 0.12 ? FLOOR.moss : FLOOR.litter;
      // Lichtung: Gras mit weichem Rand
      const cls = clearBins[bi];
      if (cls.length) {
        const nz = (v6(cx) - 0.5) * 0.5;
        for (const cl of cls) {
          const dd = ((cx - cl.x) / cl.rx) ** 2 + ((cy - cl.y) / cl.ry) ** 2 + nz;
          if (dd < 1) { ramp = dd < 0.8 || noise(cx, cy, 16) > 0.5 ? FLOOR.grass : ramp; break; }
        }
      }
      let col = f < 0.2 ? tones(ramp)[0] : f > 0.84 ? tones(ramp)[1] : ramp[2];
      const sp = noise(cx, cy, 17);
      if (ramp !== FLOOR.grass) {
        if (sp > 0.986) col = mix(col, pick(() => noise(cx, cy, 18), LEAF_COLS), 0.55);
        else if (sp < 0.008) col = mix(col, FLOOR.litter[4], 0.5);
      } else if (sp > 0.992) col = mix(col, C.petal_white[3], 0.5);
      else if (sp > 0.975) col = ramp[3];
      // Weg mit Laub
      const pd = onPathRow ? Math.abs(cy - pyOf[lx]) : Infinity;
      if (pd <= PATH_HW + 1) {
        const edge = pd > PATH_HW - 0.5;
        if (!edge || noise(cx, cy, 19) > 0.45) {
          const pf = noise(cx >> 1, cy, 20);
          col = pf < 0.25 ? FLOOR.path[1] : pf > 0.8 ? FLOOR.path[3] : FLOOR.path[2];
          if (pd <= 1 && noise(cx >> 2, cy, 21) > 0.6) col = mix(col, FLOOR.path[3], 0.5);
          const lv = noise(cx, cy, 22);
          if (lv > 0.94) col = mix(col, LEAF_COLS[Math.floor(noise(cx, cy, 23) * LEAF_COLS.length)], 0.7);
        }
        if (pd === PATH_HW + 1 && cy < pyOf[lx]) col = mix(col, FLOOR.moss[0], 0.25);
      }
      // Bach
      const sdx = cx - sxOf[kOf[lx] - kMin], sd = Math.abs(sdx);
      if (sd <= hw + 2) {
        if (sd <= hw) {
          const depth = 1 - sd / hw;
          let wc = depth > 0.55 ? R.water[1] : R.water[2];
          if (sd >= hw - 0.5) wc = R.water[1];
          const ws = noise(cx, cy >> 1, 24), wl = noise(cx >> 1, (cy + Math.round(cx * 0.3)) >> 2, 25);
          if (wl > 0.86 && depth > 0.2) wc = R.water[3];
          if (ws > 0.985) wc = R.water[4];
          if (sdx < 0 && sd > hw - 1.5) wc = WATER_EDGE; // Schattenkante links oben
          col = wc;
        } else col = sd <= hw + 1 ? FLOOR.bank[1] : mix(FLOOR.bank[2], col, 0.4);
      }
      // Sonnenflecken (tags hell, gegradet nachts dunkel)
      if (ramp !== FLOOR.grass && sd > hw + 2) {
        for (const fl of fleckBins[bi]) {
          const dd = ((cx - fl.x) / fl.rx) ** 2 + ((cy - fl.y) / fl.ry) ** 2;
          if (dd < 1) { col = mix(col, [196, 186, 112], dd < 0.45 ? 0.2 : 0.11); break; }
        }
      }
      const i = (ly * FT + lx) * 4;
      t[i] = col[0]; t[i + 1] = col[1]; t[i + 2] = col[2]; t[i + 3] = 255;
    }
  }
  floorCache.set(key, t);
  return t;
}

function paintForest(scene) {
  const { W, H, ox, oy } = scene;
  const b = new Buf(W, H);
  const halos = [], beams = [], fireflies = [];
  const secSet = new Set(scene.sections.map((s) => `${s.c},${s.r}`));
  const c0 = Math.floor(-ox / CW) - 1, c1 = Math.floor((W - ox) / CW) + 1;
  const r0 = Math.floor(-oy / CH) - 1, r1 = Math.floor((H - oy) / CH) + 1;
  const cont = scene.content;

  // Boden: reine Funktion der Inhaltskoordinaten → kachelweise gecacht (floorTile);
  // bei neuem Abschnitt, Filterwechsel oder Resize werden nur neue Kacheln berechnet.
  const bd = b.d;
  const tx0 = Math.floor(-ox / FT), tx1 = Math.floor((W - 1 - ox) / FT);
  const ty0 = Math.floor(-oy / FT), ty1 = Math.floor((H - 1 - oy) / FT);
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = floorTile(tx, ty);
      const xa = Math.max(0, tx * FT + ox), xb = Math.min(W, (tx + 1) * FT + ox);
      const ya = Math.max(0, ty * FT + oy), yb = Math.min(H, (ty + 1) * FT + oy);
      for (let y = ya; y < yb; y++) {
        const so = ((y - oy - ty * FT) * FT + (xa - ox - tx * FT)) * 4;
        bd.set(t.subarray(so, so + (xb - xa) * 4), (y * W + xa) * 4);
      }
    }
  // tiefer Wald außerhalb des Inhalts etwas dunkler
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (x < cont.x0 || x >= cont.x1 || y < cont.y0 || y >= cont.y1) {
        const dd = Math.max(cont.x0 - x, x - cont.x1 + 1, cont.y0 - y, y - cont.y1 + 1);
        const i = (y * W + x) * 4;
        const col = mix([bd[i], bd[i + 1], bd[i + 2]], [14, 20, 16], Math.min(0.32, 0.08 + dd * 0.012));
        bd[i] = col[0]; bd[i + 1] = col[1]; bd[i + 2] = col[2];
      } else x = cont.x1 - 1;
    }

  const W2 = (cx, cy) => [cx + ox, cy + oy];

  // Bodendecker: Grashalme, kleine Farnwedel, Kleeblätter, Moospolster (flach, hinter allem)
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const rr = rng(`wald:cover:${c}:${r}`);
      const grassy = !!clearingOf(c, r);
      for (let k = 0; k < 46; k++) {
        const cx = c * CW + int(rr, 0, CW - 1), cy = r * CH + int(rr, 0, CH - 1);
        const kind = rr();
        const st = stream(cx, cy);
        if (st.d < st.hw + 3 || pathDist(cx, cy) < PATH_HW + 2) continue;
        const [x, y] = W2(cx, cy);
        if (kind < 0.55) {
          const g = grassy ? FLOOR.grass : FLOOR.moss;
          b.set(x, y, g[3]); b.set(x, y - 1, g[4]);
          b.set(x - 1, y, g[2]); b.set(x - 2, y - 1, g[3]);
          b.set(x + 1, y, g[2]); b.set(x + 2, y - 1, g[3]);
          b.set(x, y + 1, mix(g[1], g[0], 0.4));
        } else if (kind < 0.72) {
          const f = R.fern;
          for (let i = 0; i < 5; i++) { b.set(x - i, y - Math.floor(i / 2), f[i % 2 ? 3 : 2]); b.set(x + i, y - Math.floor(i / 2), f[i % 2 ? 2 : 1]); }
          b.set(x, y - 1, f[3]); b.set(x, y + 1, f[0]);
        } else if (kind < 0.84) {
          const g = C.wa_moos;
          b.set(x, y, g[3]); b.set(x + 1, y, g[2]); b.set(x, y + 1, g[2]); b.set(x + 1, y + 1, g[1]);
          b.set(x + 3, y + 1, g[3]); b.set(x + 4, y + 1, g[2]);
        } else if (kind < 0.92) {
          // Moospolster
          b.ellipse(x, y, 3.2, 1.6, mix(FLOOR.moss[3], C.wa_moos[2], 0.5));
          b.set(x - 1, y - 1, C.wa_moos[3]); b.set(x + 1, y - 1, C.wa_moos[3]);
        } else {
          // Blüten im Moos (Buschwindröschen / Waldveilchen)
          const pc = rr() < 0.6 ? C.petal_white : C.petal_purple;
          b.set(x, y, pc[3]); b.set(x + 1, y, pc[2]); b.set(x, y - 1, pc[4]); b.set(x, y + 1, FLOOR.moss[1]);
        }
      }
    }

  // Ufersteine und Wasserglanz (nachts Mondglitzern)
  {
    const yA = -oy - 2, yB = H - oy + 2;
    for (let k = streamK(-ox); k <= streamK(W - ox); k++)
      for (let cy = yA; cy < yB; cy += 3) {
        const rr = rng(`wald:bank:${k}:${cy}`);
        const sx = streamX(k, cy), hw = streamHW(cy);
        if (rr() < 0.32) {
          const side = rr() < 0.5 ? -1 : 1;
          const [x, y] = W2(sx + side * (hw + 1 + int(rr, -1, 1)), cy);
          const rx = 1.5 + rr() * 2, ry = 1 + rr();
          b.ellipse(x, y, rx + 0.6, ry + 0.6, C.stone[0]);
          b.ellipse(x, y, rx, ry, rr() < 0.4 ? C.stone[2] : mix(C.stone[2], FLOOR.moss[3], 0.4));
          b.set(Math.round(x - rx * 0.5), Math.round(y - ry * 0.5), C.stone[3]);
        }
        if (rr() < 0.2) {
          const [x, y] = W2(sx + int(rr, -hw + 2, hw - 2), cy);
          b.glow(x, y, [150, 180, 210], false);
          b.glow(x + 1, y, [110, 140, 180], false);
        }
      }
  }

  // Brücken
  for (const br of bridgesNear(-ox - 40, W - ox + 40, -oy - 20, H - oy + 20)) paintBridge(b, br, ox, oy);

  // Bäume: Schatten, Wurzeln, Stämme
  const treeList = [];
  for (let r = r0; r <= r1 + 1; r++)
    for (let c = c0; c <= c1; c++)
      for (const t of treesOf(c, r)) treeList.push({ ...t, cx: c * CW + t.x, cbase: r * CH + t.base, c, r });
  treeList.sort((a, z) => a.cbase - z.cbase);
  for (const t of treeList) paintTree(b, t, ox, oy, halos);

  // Unterholz in Zellen ohne Abschnitt (Waldrand)
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (secSet.has(`${c},${r}`)) continue;
      const rr = rng(`wald:bush:${c}:${r}`);
      const d = { occ: [], feet: [] };
      for (const t of [...treesOf(c, r)]) d.feet.push({ x0: t.x - t.w, x1: t.x + t.w, y0: t.base - t.h, y1: t.base + 4 });
      for (let k = 0; k < 4; k++) {
        const x = int(rr, 12, CW - 12), y = int(rr, 18, CH - 4);
        const rx = 7 + int(rr, 0, 6), ry = 5 + int(rr, 0, 3);
        const st = stream(c * CW + x, r * CH + y);
        if (st.d < st.hw + rx + 3 || pathDist(c * CW + x, r * CH + y) < PATH_HW + ry + 3) continue;
        if (d.feet.some((f) => overlaps(f, { x0: x - rx, x1: x + rx, y0: y - ry * 2, y1: y }))) continue;
        const [wx, wy] = W2(c * CW + x, r * CH + y);
        paintBush(b, wx, wy, rx, ry, rr);
      }
    }

  // Hütte: Laterne + Fenster leuchten (Hütte steht immer in Zelle 0,0)
  for (const s of scene.sections) {
    const d = cellData(s.c, s.r);
    for (const o of d.objs) {
      const x = s.rect.x + o.x, y = s.rect.y + o.y;
      if (o.kind === 'hut') {
        halos.push({ x: x - 2, y: y - 18, r: 20, rgb: [255, 196, 110], a: 0.4 });
        halos.push({ x: x + 9, y: y - 16, r: 26, rgb: [255, 180, 100], a: 0.22 });
      }
      if (o.kind === 'fire') halos.push({ x, y: y - 6, r: 40, rgb: [255, 140, 60], a: 0.26 });
    }
  }

  // Strahlen: Sonne durch die Lichtung (tags), Mond (nachts); Nebel über dem Bach
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const t = cellType(c, r);
      const rr = rng(`wald:beam:${c}:${r}`);
      const [x, y] = W2(c * CW, r * CH);
      if (t === 'lichtung' || t === 'huette' || rr() < 0.25) {
        const bx = x + (t === 'lichtung' ? 40 : int(rr, 20, 90)), w = t === 'lichtung' ? 16 : 7 + int(rr, 0, 5);
        const top = y - 30, bot = y + (t === 'lichtung' ? 80 : 60);
        const dx = Math.round((bot - top) * 0.32);
        beams.push({ pts: [[bx, top], [bx + w, top], [bx + w + dx + 6, bot], [bx + dx - 4, bot]], rgb: [255, 232, 160], a: t === 'lichtung' ? 0.22 : 0.12, when: 'day' });
        beams.push({ pts: [[bx + 4, top], [bx + w - 2, top], [bx + w + dx, bot], [bx + dx + 2, bot]], rgb: [160, 186, 255], a: t === 'lichtung' ? 0.15 : 0.09, when: 'night' });
      }
    }
  for (let k = streamK(-ox); k <= streamK(W - ox); k++)
    for (let r = r0; r <= r1; r++) {
      const rr = rng(`wald:fog:${k}:${r}`);
      for (let j = 0; j < 2; j++) {
        const cy = r * CH + int(rr, 10, CH - 10), sx = streamX(k, cy);
        const [x, y] = W2(sx, cy);
        const w = 34 + int(rr, 0, 30), lean = int(rr, -4, 4);
        beams.push({ pts: [[x - w, y + 2], [x - w / 3, y - 3 + lean], [x + w / 2, y - 2], [x + w, y + 3], [x + w / 3, y + 5], [x - w / 2, y + 5]], rgb: [190, 205, 230], a: 0.11, when: 'night' });
      }
    }

  // Glühwürmchen: am Bach, auf Lichtungen, zwischen den Bäumen
  const rf = rng(`wald:ff:${W}:${H}:${ox}:${oy}`);
  const nff = Math.min(16, Math.max(6, Math.round((W * H) / 5200)));
  for (let k = 0; k < nff; k++) {
    let x = int(rf, 8, W - 8), y = int(rf, 12, H - 8);
    if (k % 3 === 0) {
      const s = stream(x - ox, y - oy);
      if (s.sx + ox > 0 && s.sx + ox < W) x = s.sx + ox + int(rf, -16, 16);
    }
    fireflies.push({ x, y, p: rf() * Math.PI * 2 });
  }

  const { canvas, glow } = b.finish();
  return { canvas, glow, halos, beams, fx: { fireflies }, outside: [16, 22, 18] };
}

function paintBridge(b, br, ox, oy) {
  const x0 = br.x0 + ox, x1 = br.x1 + ox, y = br.y + oy;
  const P = R.cut, D = R.darkwood;
  // Schatten aufs Wasser
  for (let x = x0 + 1; x <= x1 + 1; x++) b.set(x, y + 5, mix(R.water[0], R.water[1], 0.3));
  // Bohlen (quer), Deck y-4..y+3
  for (let x = x0; x <= x1; x++) {
    const k = (x - x0) % 4;
    for (let j = -4; j <= 3; j++) {
      let col = k === 3 ? D[1] : j === -4 ? D[3] : j === 3 ? D[1] : noise(x, j, 31) > 0.8 ? mix(D[2], D[3], 0.5) : D[2];
      if (k === 0 && j > -4 && j < 3) col = mix(D[2], D[3], 0.6);
      b.set(x, y + j, col);
    }
    b.set(x, y + 4, D[0]);
  }
  // Längsbalken vorn
  b.hline(x0, x1, y + 3, D[1]);
  // Geländer hinten: Pfosten + Handlauf
  const posts = [x0 + 1, Math.round((x0 + x1) / 2), x1 - 1];
  for (const px of posts) {
    for (let j = -12; j <= -5; j++) { b.set(px, y + j, D[3]); b.set(px + 1, y + j, D[1]); }
    b.set(px, y - 13, D[0]); b.set(px + 1, y - 13, D[0]);
  }
  for (let x = x0; x <= x1 + 1; x++) { b.set(x, y - 11, P[2]); b.set(x, y - 10, D[1]); b.set(x, y - 12, D[0]); }
  // Moos und Laub auf der Brücke
  for (let x = x0; x <= x1; x++) if (noise(x, y, 33) > 0.85) b.set(x, y - 4, C.wa_moos[3]);
  for (let k = 0; k < 4; k++) {
    const lx = x0 + 2 + Math.floor(noise(k, y, 34) * (x1 - x0 - 4)), ly = y - 2 + Math.floor(noise(k, y, 35) * 4);
    b.set(lx, ly, LEAF_COLS[k % LEAF_COLS.length]);
  }
}

function paintBush(b, x, y, rx, ry, rr) {
  const ramp = R.crown2;
  const lobes = [[0, -ry, rx, ry], [-rx * 0.55, -ry * 0.7, rx * 0.6, ry * 0.8], [rx * 0.55, -ry * 0.6, rx * 0.6, ry * 0.75]];
  for (const [dx, dy, a, c] of lobes) b.ellipse(x + dx, y + dy, a + 1, c + 1, ramp[0]);
  for (const [dx, dy, a, c] of lobes) b.ellipse(x + dx, y + dy, a, c, ramp[2]);
  for (const [dx, dy, a, c] of lobes) b.ellipse(x + dx - a * 0.25, y + dy - c * 0.35, a * 0.55, c * 0.5, ramp[3]);
  for (let k = 0; k < 6; k++) {
    const px = Math.round(x - rx + rr() * rx * 2), py = Math.round(y - ry * 2 + rr() * ry * 2);
    if (b.get(px, py)) b.set(px, py, rr() < 0.5 ? ramp[4] : ramp[1]);
  }
  for (let xx = Math.round(x - rx); xx <= x + rx; xx++) b.set(xx, Math.round(y + 1), mix(FLOOR.moss[0], FLOOR.moss[1], 0.4));
  if (rr() < 0.35) for (let k = 0; k < 3; k++) {
    const px = Math.round(x - rx * 0.6 + rr() * rx * 1.2), py = Math.round(y - ry * 1.4 + rr() * ry);
    b.set(px, py, C.petal_red[2]); b.set(px, py - 1, C.petal_red[4]);
  }
}

/** Baum (Stamm + Wurzeln) in den Hintergrund. */
function paintTree(b, t, ox, oy, halos) {
  const x = t.cx + ox, base = t.cbase + oy;
  const ramp = t.giant ? R.oldbark : R.bark;
  const hw = t.w / 2;
  const top = base - t.h;
  // Schatten rechts unten
  for (let j = 0; j < 4; j++)
    for (let i = -hw; i <= hw + t.w * 1.4; i++) {
      const xx = Math.round(x + i + 2), yy = base + j - 1;
      if (((i - t.w * 0.2) / (hw + t.w * 0.9)) ** 2 + ((j - 1.5) / 2.6) ** 2 > 1) continue;
      const c = b.get(xx, yy);
      if (c) b.set(xx, yy, mix(c, [10, 14, 10], 0.35));
    }
  // Wurzeln
  const rr = rng(`wald:roots:${t.c}:${t.r}:${t.x}`);
  const nRoots = t.giant ? 6 : 3 + int(rr, 0, 1);
  const roots = [];
  for (let k = 0; k < nRoots; k++) {
    const side = k % 2 ? 1 : -1;
    const len = (t.giant ? 14 : 5) + int(rr, 0, t.giant ? 12 : 6);
    const sx = x + side * (hw - 1 - int(rr, 0, Math.max(1, Math.floor(hw / 2))));
    const ex = sx + side * len, ey = base + int(rr, 0, t.giant ? 6 : 3);
    roots.push([sx, base - 3 - int(rr, 0, 3), ex, ey, t.giant ? 5 : 3]);
  }
  for (const [sx, sy, ex, ey, th] of roots) {
    const n = Math.max(Math.abs(ex - sx), Math.abs(ey - sy), 1);
    for (let i = 0; i <= n; i++) {
      const u = i / n, px = Math.round(sx + (ex - sx) * u), py = Math.round(sy + (ey - sy) * u);
      const thick = Math.max(1, Math.round(th * (1 - u * 0.7)));
      for (let j = 0; j < thick; j++) b.set(px, py + j, j === 0 ? ramp[3] : j === thick - 1 ? ramp[1] : ramp[2]);
      b.set(px, py + thick, ramp[0]);
      if (u < 0.6) b.set(px, py - 1, ramp[0]);
    }
  }
  // Stamm
  for (let y = top; y <= base; y++) {
    const flare = Math.max(0, 4 - (base - y)) * (t.giant ? 1.2 : 0.7);
    const xa = Math.round(x - hw - flare), xz = Math.round(x + hw + flare);
    for (let xx = xa; xx <= xz; xx++) {
      const u = (xx - xa) / Math.max(1, xz - xa);
      let col = u < 0.18 ? ramp[3] : u < 0.62 ? ramp[2] : ramp[1];
      const groove = noise(xx, (y + (xx % 3) * 2) >> 2, 41);
      if (groove > 0.78) col = mix(col, ramp[1], 0.7);
      else if (groove < 0.08 && u < 0.6) col = mix(col, ramp[4], 0.35);
      // Moos auf der Wetterseite (links unten)
      if (u < 0.45 && base - y < (t.giant ? 16 : 9) && noise(xx >> 1, y >> 1, 42) > 0.45) col = u < 0.15 ? C.wa_moos[3] : C.wa_moos[2];
      if (xx === xa || xx === xz) col = ramp[0];
      b.set(xx, y, col);
    }
  }
  // Baumhöhle (alter Baum) – die Eule darin ist ein eigenes Teil
  if (t.giant) {
    const hx = x - 3, hy = base - 18;
    b.ellipse(hx, hy - 3, 4.5, 6, ramp[0]);
    b.ellipse(hx, hy - 3, 3.5, 5, [26, 20, 18]);
    for (let i = -3; i <= 3; i++) b.set(hx + i, hy + 2, ramp[3]);
    // Leuchtpilze zwischen den Wurzeln (nachts hell)
    const gl = rng(`wald:gl:${t.c}:${t.r}`);
    for (let k = 0; k < 3; k++) {
      const [sx, sy, ex, ey] = roots[int(gl, 0, roots.length - 1)];
      const u = 0.3 + gl() * 0.5, px = Math.round(sx + (ex - sx) * u), py = Math.round(sy + (ey - sy) * u) - 1;
      for (const [dx, dy, tone] of [[0, 0, 3], [1, 0, 2], [0, -1, 4], [-1, 0, 2]]) b.glow(px + dx, py + dy, C.wa_glow[tone]);
      b.set(px, py + 1, C.cream[2]);
      halos.push({ x: px, y: py, r: 9, rgb: [110, 240, 210], a: 0.3 });
    }
  }
  // Leuchtpilze am Fuß mancher Bäume
  if (!t.giant && rr() < 0.3) {
    const side = rr() < 0.5 ? -1 : 1, px = Math.round(x + side * (hw + 3)), py = base + 1;
    for (const [dx, dy, tone] of [[0, 0, 3], [1, 0, 2], [0, -1, 4], [-1, 0, 2], [3, 1, 3], [3, 0, 4]]) b.glow(px + dx * side, py + dy, C.wa_glow[tone]);
    b.set(px, py + 1, C.cream[2]); b.set(px + 3 * side, py + 2, C.cream[2]);
    halos.push({ x: px, y: py, r: 8, rgb: [110, 240, 210], a: 0.26 });
  }
  // Baumpilze (Zunder-Konsolen) an manchen Stämmen – ragen seitlich heraus
  if (!t.giant && rr() < 0.4) {
    const fy = top + 10 + int(rr, 0, Math.max(1, t.h - 20)), side = rr() < 0.5 ? -1 : 1;
    const ex = side < 0 ? Math.round(x - hw) : Math.round(x + hw);
    const F = C.gh_butternut;
    for (let k = 0; k < (rr() < 0.5 ? 2 : 1); k++) {
      const yy = fy + k * 5, len = 3 - k;
      for (let i = 0; i <= len; i++) {
        const px = ex + side * i;
        b.set(px, yy - 1, i === len ? F[0] : F[4]);
        b.set(px, yy, i === len ? F[0] : F[2]);
        b.set(px, yy + 1, F[0]);
      }
      b.set(ex + side * (len + 1), yy, F[0]);
    }
  }
}

// --- Teile (Sprites) -------------------------------------------------------------------

const BUILD = {
  crown(v) {
    const size = Math.floor(v / 10), vv = v % 10;
    const { rx, ry, W, H: Hh } = crownDims(size);
    const a = new PixelArt(W, Hh);
    const cx = rx + 2, cy = Hh - ry - 3;
    const ramp = vv === 3 || vv === 6 ? H.crown2 : H.crown;
    const rr = rng(`wald:crown:${v}`);
    // Umriss: Hauptellipse + Lappen + kleine Blattbögen am Rand
    const blob = a.layer(ramp);
    blob.ellipse(cx, cy, rx - 3, ry - 2.5);
    const lobes = size === 2 ? 9 : 6;
    for (let k = 0; k < lobes; k++) {
      const ang = (k / lobes) * Math.PI * 2 + rr() * 0.5;
      blob.ellipse(cx + Math.cos(ang) * (rx - 6), cy + Math.sin(ang) * (ry - 5), 5 + rr() * (size === 2 ? 4 : 2), 4 + rr() * 2.5);
    }
    // Blattbüschel (oben links hell, unten rechts dunkel), von oben nach unten überlappend
    const pts = [];
    const step = size === 2 ? 8 : 7;
    for (let y = cy - ry; y <= cy + ry; y += step - 1)
      for (let x = cx - rx; x <= cx + rx; x += step) {
        const px = Math.round(x + (rr() - 0.5) * 3 + ((y / (step - 1)) % 2) * 2), py = Math.round(y + (rr() - 0.5) * 2);
        if (blob.has(px, py) && blob.has(px, py + 2)) pts.push([px, py]);
      }
    const autumn = vv === 2 || vv === 5;
    const cl = a.layer(ramp, { outline: false, shading: false });
    const al = a.layer(H.autumn, { outline: false, shading: false });
    const arc = (px, py, r0, from, to, tone) => {
      for (let k = 0; k <= 10; k++) {
        const ang = from + ((to - from) * k) / 10;
        const x = Math.round(px + Math.cos(ang) * r0), y = Math.round(py + Math.sin(ang) * r0 * 0.7);
        if (blob.has(x, y) && blob.has(x, y - 1) && blob.has(x, y + 1)) cl.set(x, y, tone);
      }
    };
    for (const [px, py] of pts) {
      const r0 = size === 2 ? 4.2 : 3.4;
      const l = (px - cx) / rx + (py - cy) / ry;
      if (l < -0.3) {
        arc(px, py, r0, Math.PI * 1.05, Math.PI * 1.75, LIGHT);
        if (blob.has(px - 1, py - 2)) cl.set(px - 1, py - 2, HIGH);
        arc(px, py + 0.5, r0, Math.PI * 0.2, Math.PI * 0.7, BASE);
      } else if (l < 0.5) {
        arc(px, py, r0, Math.PI * 1.15, Math.PI * 1.65, LIGHT);
        arc(px, py, r0, Math.PI * 0.15, Math.PI * 0.85, SHADE);
      } else arc(px, py, r0, Math.PI * 0.1, Math.PI * 0.9, SHADE);
    }
    // Herbstblätter / Lichttupfer (einzelne Pixel)
    for (let k = 0; k < (size === 2 ? 16 : 7); k++) {
      const px = Math.round(cx - rx * 0.7 + rr() * rx * 1.2), py = Math.round(cy - ry * 0.75 + rr() * ry * 1.1);
      if (!blob.has(px, py) || !blob.has(px, py - 1)) continue;
      if (autumn) al.set(px, py, rr() < 0.5 ? LIGHT : BASE);
      else cl.set(px, py, HIGH);
    }
    // Unterseite dunkel (Schatten unter dem Laub)
    const und = a.layer(ramp, { outline: false, shading: false });
    for (let x = 0; x < W; x++) for (let y = Hh - 1; y > 0; y--) if (blob.has(x, y)) { und.set(x, y, SHADE); if (blob.has(x, y - 1)) und.set(x, y - 1, SHADE); break; }
    return fin(a, cx, Hh - 1);
  },

  hut() {
    const [w, h, ax, ay] = SZ.hut;
    const a = new PixelArt(w, h);
    // Schornstein (hinter dem Dach)
    const ch = a.layer('stone');
    ch.rect(36, 3, 5, 12);
    a.layer('stone', { outline: false, shading: false }).set(37, 5, SHADE).set(39, 8, SHADE).set(37, 11, SHADE).rect(35, 2, 7, 1, LIGHT);
    const smoke = a.layer('petal_white', { outline: false, shading: false });
    smoke.set(38, 0, LIGHT).set(39, 0, BASE).set(37, 1, BASE);
    // Fundament
    a.layer('stone').rect(5, 44, 40, 2);
    a.layer('stone', { outline: false, shading: false }).set(9, 45, SHADE).set(18, 44, LIGHT).set(28, 45, SHADE).set(37, 44, LIGHT);
    // Blockwand
    const wall = a.layer(H.bark, { shading: false });
    for (let y = 24; y <= 43; y++) {
      const k = (y - 24) % 4;
      wall.rect(6, y, 38, 1, k === 0 ? LIGHT : k === 3 ? OUTLINE : k === 2 ? SHADE : BASE);
    }
    // Balkenköpfe an den Ecken
    const ends = a.layer(H.cut, { shading: false });
    for (let y = 24; y <= 40; y += 4) {
      ends.rect(3, y, 3, 3, BASE).set(3, y, LIGHT).set(4, y + 1, SHADE);
      ends.rect(44, y, 3, 3, BASE).set(44, y, LIGHT).set(45, y + 1, SHADE);
    }
    // Giebel (senkrechte Bretter)
    const gab = a.layer(H.darkwood, { shading: false, outline: false });
    for (let y = 9; y <= 23; y++) {
      const hw = Math.round((y - 7) * 1.25);
      for (let x = 25 - hw; x <= 25 + hw; x++) gab.set(x, y, x % 4 === 1 ? SHADE : y < 12 ? LIGHT : BASE);
    }
    // Dachfenster rund (leuchtet)
    a.layer(H.darkwood).ellipse(25, 16, 3, 3);
    const aw = a.layer('lamp', { outline: false, shading: false, glow: true });
    aw.ellipse(25, 16, 2, 2, BASE).set(24, 15, HIGH).set(25, 15, LIGHT);
    // Dach (bemooste Schindeln), zwei Schrägen
    const roof = a.layer(H.roof);
    for (let x = 1; x <= 49; x++) {
      const dist = Math.abs(x - 25);
      const yt = 3 + Math.round(dist * 0.85);
      if (yt > 26) continue;
      for (let j = 0; j < 5; j++) roof.set(x, yt + j);
    }
    const sh = a.layer(H.roof, { outline: false, shading: false });
    for (let x = 2; x <= 48; x++) {
      const dist = Math.abs(x - 25), yt = 3 + Math.round(dist * 0.85);
      if (yt > 25) continue;
      if ((x + (dist % 2) * 2) % 4 === 0) sh.set(x, yt + 3, SHADE);
      if (noise(x, 1, 51) > 0.6) sh.set(x, yt, HIGH);
      sh.set(x, yt + 4, SHADE);
    }
    const moss = a.layer('wa_moos', { outline: false });
    for (const [x, y] of [[12, 13], [13, 13], [16, 10], [34, 11], [35, 11], [40, 15], [8, 17], [44, 19]]) moss.set(x, y, LIGHT).set(x, y + 1);
    // Tür
    const door = a.layer(H.darkwood);
    door.rect(11, 29, 9, 15);
    const dp = a.layer(H.darkwood, { outline: false, shading: false });
    for (let y = 30; y <= 43; y++) { dp.set(13, y, SHADE); dp.set(16, y, SHADE); }
    dp.rect(11, 33, 9, 1, LIGHT).rect(11, 39, 9, 1, LIGHT);
    a.layer('lamp', { outline: false, shading: false }).set(18, 37, SHADE);
    // Laterne neben der Tür (leuchtet)
    a.layer('dark', { outline: false, shading: false }).set(23, 26, HIGH).set(24, 26, HIGH).set(23, 27, HIGH);
    const lf = a.layer('dark');
    lf.rect(22, 28, 3, 4, HIGH);
    const lg = a.layer('lamp', { outline: false, shading: false, glow: true });
    lg.set(23, 29, HIGH).set(23, 30, BASE);
    // Fenster mit Fensterladen und Blumenkasten
    a.layer('leaf_sage').rect(27, 28, 2, 8).rect(41, 28, 2, 8);
    const fr = a.layer(H.cut);
    fr.rect(29, 28, 12, 9);
    const gl = a.layer('lamp', { outline: false, shading: false, glow: true });
    gl.rect(30, 29, 10, 7, BASE);
    gl.rect(30, 29, 4, 3, LIGHT).set(30, 29, HIGH);
    const mull = a.layer(H.cut, { outline: false, shading: false });
    mull.rect(34, 29, 1, 7, SHADE).rect(30, 32, 10, 1, SHADE);
    const box = a.layer(H.darkwood);
    box.rect(28, 37, 14, 2);
    const fl = a.layer('petal_red', { outline: false, shading: false });
    fl.set(29, 36, LIGHT).set(32, 35, BASE).set(36, 36, LIGHT).set(39, 35, BASE);
    a.layer('petal_white', { outline: false, shading: false }).set(31, 36, HIGH).set(34, 35, LIGHT).set(38, 36, HIGH);
    a.layer('leaf', { outline: false, shading: false }).set(30, 36, BASE).set(33, 36, BASE).set(35, 36, SHADE).set(37, 36, BASE).set(40, 36, SHADE);
    return fin(a, ax, ay, { halo: { dx: 10, dy: -15, r: 18, rgb: [255, 196, 110], a: 0.3 } });
  },

  fire() {
    const [w, h, ax, ay] = SZ.fire;
    const a = new PixelArt(w, h);
    // Glut/Asche
    a.layer('dark', { outline: false, shading: false }).ellipse(11, 10, 7, 2.6, HIGH);
    // Holzscheite
    const lg = a.layer('wood');
    lg.line(5, 11, 15, 7).line(5, 7, 16, 11);
    // Flammen (leuchten)
    const f1 = a.layer('petal_orange', { outline: false, shading: false, glow: true });
    for (const [x, y0] of [[9, 4], [10, 2], [11, 1], [12, 3], [13, 5], [8, 6]]) for (let y = y0; y <= 8; y++) f1.set(x, y, y < y0 + 2 ? LIGHT : BASE);
    const f2 = a.layer('lamp', { outline: false, shading: false, glow: true });
    f2.set(10, 6, HIGH).set(11, 5, HIGH).set(11, 4, LIGHT).set(12, 7, LIGHT).set(10, 7, LIGHT).set(11, 7, HIGH);
    // Steinring
    const st = a.layer('stone');
    for (let k = 0; k < 11; k++) {
      const ang = (k / 11) * Math.PI * 2;
      const x = 11 + Math.cos(ang) * 8.4, y = 10 + Math.sin(ang) * 2.8;
      if (Math.sin(ang) < -0.3 && k % 2) continue;
      st.rect(Math.round(x) - 1, Math.round(y), 2, 2);
    }
    return fin(a, ax, ay, { halo: { dx: 0, dy: -6, r: 24, rgb: [255, 170, 80], a: 0.42 } });
  },

  bench(v) {
    const [w, h, ax, ay] = SZ.bench;
    const a = new PixelArt(w, h);
    const lg = a.layer(H.bark);
    lg.rect(2, 2, 18, 4);
    const tex = a.layer(H.bark, { outline: false, shading: false });
    for (let x = 4; x < 19; x += 4) tex.set(x, 3, SHADE).set(x + 1, 4, SHADE);
    const end = a.layer(H.cut);
    end.ellipse(20.5, 4, 1.6, 2.4);
    a.layer(H.cut, { outline: false, shading: false }).set(20, 4, SHADE);
    a.layer(H.bark).rect(4, 6, 2, 1).rect(16, 6, 2, 1);
    if (v) a.layer('wa_moos', { outline: false }).rect(6, 1, 5, 1);
    else a.layer('petal_white', { outline: false, shading: false }).set(8, 1, SHADE);
    return fin(a, ax, ay);
  },

  woodpile(v) {
    const [w, h, ax, ay] = SZ.woodpile;
    const a = new PixelArt(w, h);
    const rows = v ? [[3, 12, 4], [5, 8, 3], [7, 4, 2]] : [[2, 12, 4], [4, 8, 4], [6, 4, 3]];
    for (const [x0, y, n] of rows)
      for (let k = 0; k < n; k++) {
        const l = a.layer(H.cut);
        l.ellipse(x0 + k * 4 + 1.5, y, 1.9, 1.9);
        a.layer(H.cut, { outline: false, shading: false }).set(x0 + k * 4 + 1, y, SHADE).set(x0 + k * 4, y - 1, HIGH);
      }
    const p = a.layer(H.darkwood);
    p.rect(1, 3, 1, 12).rect(18, 3, 1, 12);
    a.layer('wa_moos', { outline: false }).set(6, 2).set(7, 2).set(12, 2);
    return fin(a, ax, ay);
  },

  basket(v) {
    const [w, h, ax, ay] = SZ.basket;
    const a = new PixelArt(w, h);
    // Pilze im Korb
    const caps = a.layer(v ? 'gh_butternut' : 'cap_red');
    caps.ellipse(5, 4, 2.4, 1.6).ellipse(9, 3.5, 2.2, 1.6);
    a.layer('petal_white', { outline: false, shading: false }).set(4, 3, HIGH).set(9, 3, HIGH);
    a.layer(H.wicker, { outline: false, shading: false }).line(2, 5, 7, 0, LIGHT).line(7, 0, 12, 5, LIGHT);
    const k = a.layer(H.wicker);
    k.rect(2, 5, 11, 5);
    const wv = a.layer(H.wicker, { outline: false, shading: false });
    for (let x = 2; x < 13; x++) for (let y = 5; y < 10; y++) if ((x + y) % 3 === 0) wv.set(x, y, SHADE);
    wv.rect(2, 5, 11, 1, HIGH);
    return fin(a, ax, ay);
  },

  log(v) {
    const [w, h, ax, ay] = SZ.log;
    const a = new PixelArt(w, h);
    // Stamm
    const lg = a.layer(H.bark);
    lg.rect(3, 5, 48, 10);
    // abgebrochenes Ende links
    lg.set(2, 7).set(2, 8).set(1, 9).set(2, 11);
    const tex = a.layer(H.bark, { outline: false, shading: false });
    for (let x = 4; x < 50; x++) {
      if (noise(x, 2, 61) > 0.7) tex.set(x, 9 + (x % 2), SHADE);
      if (noise(x, 3, 61) > 0.75) tex.set(x, 12, SHADE);
      tex.set(x, 14, SHADE);
      if (noise(x, 4, 61) > 0.8) tex.set(x, 7, LIGHT);
    }
    // Schnittfläche rechts
    const end = a.layer(H.cut);
    end.ellipse(52, 10, 3.2, 5.4);
    const rings = a.layer(H.cut, { outline: false, shading: false });
    rings.ellipse(52, 10, 1.6, 3, SHADE).set(52, 10, BASE).set(51, 7, HIGH);
    // Moosdecke oben (hängt unregelmäßig herab)
    const moss = a.layer('wa_moos');
    for (let x = 6; x < 46; x++) {
      const dn = noise(x >> 1, 5, 62);
      const yb = 6 + (dn > 0.7 ? 2 : dn > 0.4 ? 1 : 0);
      if (noise(x, 6, 63) > 0.92) continue;
      for (let y = 4; y <= yb; y++) moss.set(x, y);
    }
    const mh = a.layer('wa_moos', { outline: false, shading: false });
    for (let x = 7; x < 45; x += 3) mh.set(x + (x % 2), 4, HIGH);
    // kleine Konsolenpilze an der Seite und ein Farnwedel
    const br = a.layer('gh_pumpkin_beige');
    br.rect(30, 11, 3, 1).rect(34, 12, 2, 1);
    const fern = a.layer(H.fern, { outline: false, shading: false });
    fern.line(12, 4, 9, 0, BASE).set(10, 2, LIGHT).set(8, 1, LIGHT).set(11, 1, BASE).set(9, 3, BASE);
    if (v) a.layer('cap_red').ellipse(40, 4, 1.5, 1);
    return fin(a, ax, ay);
  },

  stump(v) {
    const [w, h, ax, ay] = SZ.stump;
    const a = new PixelArt(w, h);
    const bk = a.layer(H.bark);
    bk.rect(3, 4, 12, 8);
    bk.rect(1, 10, 3, 2).rect(14, 10, 3, 2);
    const tex = a.layer(H.bark, { outline: false, shading: false });
    for (const x of [5, 8, 11]) for (let y = 6; y <= 11; y++) if ((x + y) % 3) tex.set(x, y, SHADE);
    const top = a.layer(H.cut);
    top.ellipse(9, 3.5, 6, 2.2);
    const rings = a.layer(H.cut, { outline: false, shading: false });
    rings.ellipse(9, 3.5, 3.2, 1.1, SHADE).set(9, 3, BASE).set(5, 3, HIGH);
    a.layer('wa_moos', { outline: false }).rect(3, 7, 2, 4).set(5, 10);
    if (v === 2) a.layer('cap_red').set(14, 8).set(15, 8);
    if (v === 1) a.layer('gh_pumpkin_beige').rect(14, 6, 2, 1);
    return fin(a, ax, ay);
  },

  boulder0(v) { return boulder(0, v); },
  boulder1(v) { return boulder(1, v); },
  boulder2(v) { return boulder(2, v); },

  hochsitz() {
    const [w, h, ax, ay] = SZ.hochsitz;
    const a = new PixelArt(w, h);
    // hintere Beine
    const back = a.layer(H.darkwood);
    back.rect(7, 26, 2, 26).rect(19, 26, 2, 26);
    // Plattform
    const pl = a.layer(H.bark);
    pl.rect(3, 24, 22, 4);
    const pt = a.layer(H.bark, { outline: false, shading: false });
    for (let x = 4; x < 24; x += 3) pt.set(x, 25, SHADE);
    pt.rect(3, 24, 22, 1, HIGH);
    // Geländer
    const rail = a.layer(H.bark);
    rail.rect(3, 14, 2, 10).rect(23, 14, 2, 10).rect(3, 14, 22, 2);
    a.layer(H.bark, { outline: false, shading: false }).rect(5, 14, 18, 1, LIGHT);
    // vordere Beine (schräg nach außen)
    const legs = a.layer(H.bark);
    legs.line(4, 28, 2, 55).line(5, 28, 3, 55).line(23, 28, 25, 55).line(24, 28, 26, 55);
    // Leiter
    const lad = a.layer(H.cut);
    lad.line(10, 28, 9, 55).line(17, 28, 18, 55);
    for (let y = 32; y <= 53; y += 5) lad.line(10, y, 17, y);
    a.layer('wa_moos', { outline: false }).rect(2, 53, 3, 2).rect(24, 53, 3, 2);
    return fin(a, ax, ay);
  },

  wetstone(v) {
    const [w, h, ax, ay] = SZ.wetstone;
    const a = new PixelArt(w, h);
    a.layer(H.water, { outline: false, shading: false }).rect(1, 5, 14, 2, LIGHT).set(0, 6, HIGH).set(15, 6, HIGH);
    a.layer('stone').ellipse(8, 4, 6.4, 2.6);
    a.layer('wa_moos', { outline: false }).ellipse(6.5, 3, 3, 1);
    void v;
    return fin(a, ax, ay);
  },

  sign() {
    const [w, h, ax, ay] = SZ.sign;
    const a = new PixelArt(w, h);
    a.layer(H.darkwood).rect(5, 3, 2, 16);
    const b1 = a.layer(H.cut);
    b1.rect(1, 4, 11, 3).set(12, 5);
    const b2 = a.layer(H.cut);
    b2.rect(2, 9, 10, 3).set(1, 10);
    const t = a.layer(H.darkwood, { outline: false, shading: false });
    for (const x of [3, 5, 7, 9]) t.set(x, 5, SHADE);
    for (const x of [4, 6, 8]) t.set(x, 10, SHADE);
    a.layer('wa_moos', { outline: false }).rect(4, 18, 4, 1).set(5, 17);
    return fin(a, ax, ay);
  },

  // --- kleine Deko -------------------------------------------------------------------
  minimush(v) {
    const a = new PixelArt(9, 7);
    const ramp = ['gh_butternut', 'bw_russet', 'gh_pumpkin_beige'][v % 3];
    a.layer('cream').rect(2, 4, 1, 2).rect(6, 3, 1, 3);
    const cp = a.layer(ramp);
    cp.ellipse(2.5, 3, 1.8, 1).ellipse(6.5, 2, 2.2, 1.2);
    a.layer('cream', { outline: false, shading: false }).set(4, 5, LIGHT);
    a.layer(ramp, { outline: false, shading: false }).set(4, 4, BASE).set(4, 3, LIGHT);
    return fin(a, 4, 6);
  },
  glowmush(v) {
    const a = new PixelArt(9, 8);
    a.layer('cream').rect(3, 4, 1, 3).rect(6, 5, 1, 2);
    const g = a.layer('wa_glow', { glow: true });
    g.ellipse(3.5, 3, 2.2, 1.3).ellipse(6.5, 4.4, 1.5, 0.9);
    if (v) g.set(1, 6);
    a.layer('wa_moos', { outline: false, shading: false }).rect(1, 7, 7, 1, BASE);
    return fin(a, 4, 7, { halo: { dx: 0, dy: -4, r: 10, rgb: [110, 240, 210], a: 0.32 } });
  },
  fern(v) {
    const a = new PixelArt(15, 11);
    const f = a.layer(v === 2 ? H.crown2 : H.fern, { outline: false, shading: false });
    const fronds = [[7, 10, 1, 2], [7, 10, 13, 3], [7, 10, 4, 0], [7, 10, 10, 0], [7, 10, 7, 1]];
    for (const [x0, y0, x1, y1] of fronds) {
      f.line(x0, y0, x1, y1, SHADE);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 1; i < n; i += 2) {
        const px = Math.round(x0 + ((x1 - x0) * i) / n), py = Math.round(y0 + ((y1 - y0) * i) / n);
        f.set(px - 1, py, x1 < x0 ? LIGHT : BASE).set(px + 1, py, x1 < x0 ? BASE : LIGHT).set(px, py - 1, HIGH);
      }
    }
    f.set(6, 10, OUTLINE).set(7, 10, OUTLINE).set(8, 10, OUTLINE);
    return fin(a, 7, 10);
  },
  acorns() {
    const a = new PixelArt(8, 4);
    a.layer('gh_butternut').set(1, 2).set(5, 2);
    a.layer('wood').set(1, 1).set(5, 1).set(6, 1);
    return fin(a, 4, 3);
  },
  pebbles(v) {
    const a = new PixelArt(11, 5);
    const s = a.layer('stone');
    s.ellipse(3, 2.6, 2, 1.3);
    if (v !== 1) s.ellipse(7.5, 3, 1.4, 1);
    a.layer('stone').set(9, 3);
    return fin(a, 5, 4);
  },
  frog() {
    const a = new PixelArt(8, 6);
    const f = a.layer('leaf');
    f.rect(2, 2, 4, 3).set(1, 4).set(6, 4);
    a.layer('cream', { outline: false, shading: false }).set(2, 2, HIGH).set(5, 2, HIGH);
    a.layer('dark', { outline: false, shading: false }).set(2, 1, BASE).set(5, 1, BASE);
    return fin(a, 4, 5);
  },
  flowers(v) {
    const a = new PixelArt(11, 8);
    a.layer('stem', { outline: false, shading: false }).line(2, 7, 2, 4, BASE).line(5, 7, 6, 3, SHADE).line(8, 7, 8, 5, BASE);
    a.layer('leaf', { outline: false, shading: false }).set(3, 6, LIGHT).set(7, 6, BASE).set(4, 7, BASE);
    const ramp = ['petal_white', 'petal_purple', 'petal_white'][v % 3];
    const p = a.layer(ramp, { outline: false, shading: false });
    for (const [x, y] of [[2, 3], [6, 2], [8, 4]]) p.set(x - 1, y, LIGHT).set(x + 1, y, BASE).set(x, y - 1, HIGH).set(x, y + 1, BASE);
    const ctr = a.layer('petal_yellow', { outline: false, shading: false });
    for (const [x, y] of [[2, 3], [6, 2], [8, 4]]) ctr.set(x, y, LIGHT);
    return fin(a, 5, 7);
  },
  tuft(v) {
    const a = new PixelArt(11, 10);
    const g = a.layer(v === 1 ? H.fern : 'wa_moos', { outline: false, shading: false });
    for (const [tx, ty] of [[1, 3], [3, 0], [5, 1], [8, 2], [9, 5], [4, 3], [2, 6], [7, 5]]) {
      g.line(5, 9, tx, ty, tx < 5 ? LIGHT : BASE);
      g.set(tx, ty, HIGH);
    }
    g.set(4, 9, SHADE).set(5, 9, OUTLINE).set(6, 9, SHADE);
    return fin(a, 5, 9);
  },
  leafpile(v) {
    const a = new PixelArt(12, 6);
    const ramps = ['petal_orange', 'bw_russet', 'petal_yellow'];
    for (let i = 0; i < 8; i++) {
      const n = Math.floor(noise(i, v, 71) * 1e6);
      const x = 1 + (n % 9), y = 1 + ((n >> 4) % 4);
      a.layer(ramps[(n >> 8) % 3], { outline: false, shading: false }).set(x, y, LIGHT).set(x + 1, y, BASE).set(x, y + 1, SHADE);
    }
    return fin(a, 6, 5);
  },
  pinecone() {
    const a = new PixelArt(5, 6);
    const p = a.layer('wood');
    p.rect(1, 1, 3, 4);
    a.layer('wood', { outline: false, shading: false }).set(1, 2, HIGH).set(3, 3, SHADE).set(2, 4, SHADE);
    return fin(a, 2, 5);
  },
  twig(v) {
    const a = new PixelArt(13, 5);
    const t = a.layer(H.bark, { outline: false, shading: false });
    t.line(1, 3, 11, 2, BASE).line(5, 3, 7, 1, LIGHT);
    if (v) t.line(8, 2, 10, 0, BASE);
    a.layer(H.bark, { outline: false, shading: false }).line(2, 4, 11, 3, OUTLINE);
    if (v === 2) a.layer('leaf', { outline: false, shading: false }).set(10, 1, LIGHT);
    return fin(a, 6, 4);
  },
  mossclump() {
    const a = new PixelArt(10, 5);
    a.layer('wa_moos').ellipse(5, 3, 3.6, 1.6);
    a.layer('wa_moos', { outline: false, shading: false }).set(3, 2, HIGH).set(6, 2, LIGHT);
    return fin(a, 5, 4);
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
    a.layer('gh_butternut', { outline: false, shading: false }).set(9, 7, BASE);
    return fin(a, 6, 11);
  },
  hedgehog() {
    const a = new PixelArt(12, 8);
    const b = a.layer(H.hedge);
    b.ellipse(5.5, 4.5, 4.6, 2.8);
    const sp = a.layer(H.hedge, { outline: false, shading: false });
    for (let x = 2; x <= 9; x++) for (let y = 2; y <= 6; y++) if ((x + y * 2) % 3 === 0 && b.has(x, y)) sp.set(x, y, (x + y) % 2 ? SHADE : HIGH);
    const face = a.layer('gh_pumpkin_beige');
    face.rect(9, 4, 2, 2).set(11, 5);
    a.layer('dark', { outline: false, shading: false }).set(10, 4, BASE).set(12, 5, BASE);
    return fin(a, 6, 7);
  },
  fox() {
    // schlafender Fuchs, eingerollt, Schwanz um die Nase
    const a = new PixelArt(19, 10);
    const body = a.layer(H.fox);
    body.ellipse(9, 5.5, 7, 3.6);
    const head = a.layer(H.fox);
    head.ellipse(4.5, 5.5, 3, 2.6);
    head.set(3, 2).set(5, 2);
    const tail = a.layer(H.fox);
    tail.ellipse(10, 7.2, 7.5, 1.8);
    a.layer('cream', { outline: false, shading: false }).set(15, 7, HIGH).set(16, 7, HIGH).set(17, 7, LIGHT).set(3, 7, LIGHT).set(4, 7, HIGH);
    a.layer('dark', { outline: false, shading: false }).set(4, 5, HIGH).set(5, 5, HIGH).set(1, 6, BASE).set(3, 3, BASE).set(5, 3, BASE);
    return fin(a, 9, 9);
  },
  owl() {
    // Eule auf dem Geländer: tags schläft sie, nachts leuchten die Augen
    const a = new PixelArt(10, 13);
    const b = a.layer(H.owl);
    b.ellipse(5, 7.5, 3.4, 4.4);
    b.set(2, 2).set(8, 2);
    const fc = a.layer(H.owl, { outline: false, shading: false });
    fc.rect(3, 4, 5, 3, HIGH);
    for (const [x, y] of [[4, 8], [6, 9], [4, 10], [6, 11]]) fc.set(x, y, SHADE);
    a.layer('dark', { outline: false, shading: false }).set(4, 5, LIGHT).set(6, 5, LIGHT);
    a.layer('gh_butternut', { outline: false, shading: false }).set(5, 6, SHADE).set(4, 12, BASE).set(6, 12, BASE);
    // Augen tags geschlossen; die offenen Augen liegen nur in der Leucht-Ebene (nachts)
    return nightEyes(a, [[4, 5], [6, 5]], 5, 12, { dx: 0, dy: -7, r: 6, rgb: [255, 220, 130], a: 0.25 });
  },
  owlhole() {
    // Kopf der Eule in der Baumhöhle: tags schlafend (Linien), nachts offene Augen
    const a = new PixelArt(9, 8);
    const h = a.layer(H.owl);
    h.ellipse(4, 4.5, 2.8, 2.6);
    h.set(2, 1).set(6, 1);
    a.layer(H.owl, { outline: false, shading: false }).rect(2, 3, 5, 2, HIGH);
    a.layer('dark', { outline: false, shading: false }).set(3, 4, LIGHT).set(5, 4, LIGHT);
    a.layer('gh_butternut', { outline: false, shading: false }).set(4, 5, SHADE);
    return nightEyes(a, [[3, 4], [5, 4]], 4, 7, { dx: 0, dy: -3, r: 6, rgb: [255, 220, 130], a: 0.25 });
  },
  web() {
    // Spinnennetz mit Tautropfen (glitzern nachts)
    const a = new PixelArt(13, 13);
    const twig = a.layer(H.bark, { outline: false, shading: false });
    twig.line(0, 12, 2, 0, BASE).line(12, 12, 11, 1, SHADE);
    const w = a.layer(H.web, { outline: false, shading: false });
    const cx = 6.5, cy = 5.5;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      w.line(Math.round(cx), Math.round(cy), Math.round(cx + Math.cos(ang) * 5), Math.round(cy + Math.sin(ang) * 5), SHADE);
    }
    for (const rad of [2, 4]) for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      w.set(Math.round(cx + Math.cos(ang) * rad), Math.round(cy + Math.sin(ang) * rad), BASE);
    }
    const dew = a.layer(H.web, { outline: false, shading: false, glow: true });
    for (const [x, y] of [[3, 5], [9, 4], [6, 9], [8, 8], [5, 2]]) dew.set(x, y, HIGH);
    return fin(a, 6, 12);
  },
};

/** Sprite, dessen Augen nur nachts (Leucht-Ebene) offen sind. */
function nightEyes(a, eyes, ax, ay, halo) {
  const g = new PixelArt(a.w, a.h);
  const l = g.layer('lamp', { outline: false, shading: false });
  for (const [x, y] of eyes) l.set(x, y, BASE);
  return { img: a.toCanvas().img, glow: g.toCanvas().img, ax, ay, halo };
}

function boulder(size, v) {
  const [w, h, ax, ay] = SZ[`boulder${size}`];
  const a = new PixelArt(w, h);
  const rx = w / 2 - 1.5, ry = h / 2 - 1.2;
  const s = a.layer('stone');
  s.ellipse(w / 2, h / 2 + 0.5, rx, ry);
  if (size < 2) s.ellipse(w / 2 + rx * 0.45, h / 2 + ry * 0.35, rx * 0.55, ry * 0.6);
  // Risse und Flechten
  const t = a.layer('stone', { outline: false, shading: false });
  t.line(Math.round(w * 0.55), Math.round(h * 0.35), Math.round(w * 0.62), Math.round(h * 0.75), SHADE);
  if (v === 1) t.set(Math.round(w * 0.3), Math.round(h * 0.6), HIGH).set(Math.round(w * 0.35), Math.round(h * 0.62), HIGH);
  // Moosdecke
  const m = a.layer('wa_moos');
  m.ellipse(w / 2 - 1, h * 0.32, rx * 0.8, ry * 0.42);
  if (size < 2) m.rect(Math.round(w * 0.2), Math.round(h * 0.35), 2, 3);
  a.layer('wa_moos', { outline: false, shading: false }).set(Math.round(w * 0.35), Math.round(h * 0.22), HIGH).set(Math.round(w * 0.55), Math.round(h * 0.2), HIGH);
  if (v === 2 && size < 2) {
    a.layer('wa_glow', { glow: true }).set(Math.round(w * 0.82), Math.round(h * 0.7)).set(Math.round(w * 0.86), Math.round(h * 0.62));
    return fin(a, ax, ay, { halo: { dx: Math.round(w * 0.34), dy: -Math.round(h * 0.35), r: 8, rgb: [110, 240, 210], a: 0.3 } });
  }
  return fin(a, ax, ay);
}

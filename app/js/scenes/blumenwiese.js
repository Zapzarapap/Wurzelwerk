// Blumenwiese – Szene (API: docs/SZENEN.md).
//
// Eine sanfte Hügelwiese in 3/4-Aufsicht. Oben liegt der Horizont (Himmel,
// ferne Hügel, Baumreihe), darunter wächst die Wiese in Wiesenstücken
// (128×112 Welt-Pixel). Jedes Stück ist ein eigener Ort:
//   hof      – Häuschen mit Bauerngarten-Beet, Bienenkörben, Regentonne (Start)
//   teich    – Teich mit Seerosen, Schilf, Steg, Enten
//   obst     – Obstbaum mit Bank, Schaukel und Laterne, kleiner Blütenbaum
//   feld     – Feldrand: Kornfeld mit Vogelscheuche, Holzzaun mit Rosenbogen
//   mauer    – Trockenmauer mit Blumen davor, Wegweiser
//   picknick – Picknickdecke mit Korb, Tassen, Windlicht, Erdbeeren
//   garten   – zweites Beet mit Bienenkörben und Vogelhäuschen
// Ein geschwungener Trampelpfad verbindet die Orte (Baum: jedes Stück hängt am
// früheren Nachbarn links oder oben). Pflanzen stehen locker in Gruppen an
// Weg-, Zaun-, Mauer- und Teichrändern, im Beet, im Kornfeld und auf der Wiese.
// Tag: Falter, Bienen, Wolkenschatten. Nacht: Sterne, Mond, Laternen,
// erleuchtete Fenster, Glühwürmchen über Teich und hohem Gras.
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, C, Buf, rgbRamp, mix, fin, sprite } from '../scenekit/draw.js';
import { gridSequence, plantBox, overlaps } from '../scenekit/engine.js';
import { rng, noise, int, pick } from '../scenekit/rng.js';
import { propBox } from '../scenekit/props.js';

// --- Maße --------------------------------------------------------------------
const SW = 128, SH = 112;
const PAD = { top: 74, left: 6, right: 6, bottom: 12 };
const GRID = { cw: SW, ch: SH, aspect: 1.05, start: [2, 1] };

// --- eigene Rampen (outline, shade, base, light, highlight) -------------------
const HX = {
  straw: ['#5a3c14', '#9a7030', '#c89a48', '#e2bc6a', '#f4dc98'],
  roof: ['#3a1e1c', '#6e3428', '#9a4a34', '#c06a48', '#de9468'],
  plaster: ['#6a5848', '#b8a68c', '#e0d2b8', '#f0e6d2', '#faf4e8'],
  darkwood: ['#2a1a14', '#432a1e', '#5e3c28', '#7a5236', '#966c48'],
  blossom: ['#6a3048', '#c0708c', '#e8a2b6', '#f6c6d2', '#fde6ec'],
  wicker: ['#5a3c1c', '#9a6a34', '#c8944c', '#e0b46c', '#f2d494'],
  shutter: ['#2a3a32', '#46604c', '#6a8a66', '#94b080', '#c2d4a0'],
  water: ['#1e3a4a', '#2e5a6e', '#3f7a8a', '#62a0aa', '#a6d4d0'],
  brick: ['#4a2a22', '#7e4636', '#a45c44', '#c27a5a', '#dca084'],
};
const R = Object.fromEntries(Object.entries(HX).map(([k, v]) => [k, rgbRamp(v)]));
// Wiese: dicht beieinanderliegende Töne (ruhige Fläche)
const MEADOW = rgbRamp(['#2c5634', '#3c7440', '#4a8646', '#58964c', '#68a654']);
const PATH = rgbRamp(['#5a4232', '#8c6c4a', '#ae8c62', '#c4a476', '#d8bc8e']);
const GRAIN = rgbRamp(['#6a4a18', '#b08a36', '#d2ac52', '#e6c66e', '#f4e09a']);
const FAR = rgbRamp(['#3c5a5a', '#5e8078', '#7c9c8c', '#98b4a0', '#b4ccb4']);
const NEAR = rgbRamp(['#24402c', '#2f5a3a', '#3e6e44', '#56884e', '#78a462']);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** weiches Wertrauschen 0..1 (für Hügel, Wolkenschatten) */
function vnoise(x, y, s, seed) {
  const gx = Math.floor(x / s), gy = Math.floor(y / s);
  const fx = x / s - gx, fy = y / s - gy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = noise(gx, gy, seed), b = noise(gx + 1, gy, seed), c = noise(gx, gy + 1, seed), d = noise(gx + 1, gy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// --- Raster der Wiesenstücke ---------------------------------------------------
let seq = [], index = new Map();
function ensure(n) {
  if (n > seq.length) {
    seq = gridSequence(Math.max(n, seq.length * 2, 16), GRID);
    index = new Map(seq.map((c, k) => [`${c[0]},${c[1]}`, k]));
  }
}
const cellOf = (i) => { ensure(i + 1); return seq[i]; };

/** Elternstück (früherer Nachbar links oder oben) → [Seite, Index] | null */
function parentOf(i) {
  if (i === 0) return null;
  const [c, r] = cellOf(i);
  const cand = [];
  const l = index.get(`${c - 1},${r}`), t = index.get(`${c},${r - 1}`);
  if (l !== undefined && l < i) cand.push(['L', l]);
  if (t !== undefined && t < i) cand.push(['T', t]);
  if (!cand.length) return null;
  return cand.length === 1 ? cand[0] : cand[Math.floor(rng(`bw:parent:${i}`)() * 2)];
}

const ORDER = ['picknick', 'teich', 'obst', 'feld', 'mauer', 'garten'];
function typeOf(i) {
  if (i === 0) return 'hof';
  const block = Math.floor((i - 1) / ORDER.length);
  const perm = block === 0 ? [...ORDER] : ORDER.map((t) => [rng(`bw:block:${block}:${t}`)(), t]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  return perm[(i - 1) % ORDER.length];
}

// Übergänge des Pfads: auf gemeinsamen Kanten gleich (nur von der Kante abhängig)
const portL = (c, r) => [0, 56 + int(rng(`bw:ev:${c}:${r}`), -6, 6)];
const portT = (c, r) => [64 + int(rng(`bw:eh:${c}:${r}`), -8, 8), 0];
function ports(c, r) {
  const L = portL(c, r), R_ = portL(c + 1, r), T = portT(c, r), B = portT(c, r + 1);
  return { L, R: [SW, R_[1]], T, B: [B[0], SH] };
}
const SWAP = { L: 'R', R: 'L', T: 'T', B: 'B' };
const OPP = { L: 'R', R: 'L', T: 'B', B: 'T' };

function bez(p0, c, p1, step = 2) {
  const len = Math.hypot(c[0] - p0[0], c[1] - p0[1]) + Math.hypot(p1[0] - c[0], p1[1] - c[1]);
  const n = Math.max(4, Math.ceil(len / step));
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
  }
  return out;
}

// --- Teile: Größen [w, h, ax] (Anker = Fußpunkt; Läufe ab linker Kante) ------------
const SIZE = {
  cottage: [58, 54, 29], hive: [14, 16, 7], birdhouse: [13, 30, 6], gate: [26, 27, 13], tree: [62, 64, 31],
  treeS: [46, 50, 23], swing: [15, 0, 7], bench: [28, 15, 14], sign: [20, 26, 10], lamppost: [13, 28, 3],
  basket: [14, 12, 7], reeds: [13, 19, 6], duck: [9, 7, 4], scarecrow: [22, 34, 11], barrel: [12, 14, 6],
  rabbit: [10, 9, 5], hedgehog: [10, 7, 5], sprout: [8, 6, 4], shroom: [7, 7, 3], flowers: [9, 6, 4], puff: [9, 12, 4],
  blades: [18, 22, 9], fence: [0, 15, 0], wall: [0, 13, 0], plate: [9, 4, 4],
};
function boxOf(p) {
  if (p.prop) return propBox(p.prop, p.x, p.y, 0);
  const [w0, h0, ax] = SIZE[p.kind] || [12, 12, 6];
  const w = p.len != null && (p.kind === 'fence' || p.kind === 'wall') ? p.len + 3 : w0;
  const h = p.kind === 'swing' ? p.len + 4 : h0;
  const x0 = p.flip ? p.x + ax - (w - 1) : p.x - ax;
  return { x0, x1: x0 + w - 1, y0: p.y - h + 1, y1: p.y };
}

// --- Orte (Layouts in unverspiegelten Koordinaten; X() spiegelt) -------------------
// Ergebnis: wp (Pfadknoten), ctrl je Seite (Kontrollpunkt der Pfadkurve),
// statics (Möbel/Deko), blocks (kein Fuß hier), zones (Pflanzgruppen), feat (Boden),
// lights (Lichthöfe nachts), fx-Hinweise.
const LAYOUT = {
  hof(rnd, X) {
    const L = base();
    L.wp = [X(90), 70];
    L.ctrl = { L: [X(40), 64], R: [X(112), 64], T: [X(80), 30], B: [X(84), 96] };
    L.statics.push(st('cottage', X(34), 52, { v: 0 }));
    L.statics.push(st('barrel', X(70), 50));
    L.statics.push(st('hive', X(100), 36, { v: 0 }), st('hive', X(116), 42, { v: 1 }));
    L.statics.push(st('birdhouse', X(118), 102));
    L.extra.push({ p0: [X(38), 54], c: [X(52), 76], p1: L.wp, stones: true });
    L.feat.bed = [{ x: Math.min(X(6), X(34)), y: 60, w: 28, h: 44 }];
    L.feat.mown.push({ x: X(92), y: 76, rx: 30, ry: 22 });
    L.feat.blooms.push({ x: X(112), y: 64, rx: 12, ry: 8, col: 1 });
    L.lights.push({ x: X(33), y: 16, r: 14 }, { x: X(50), y: 34, r: 12 }, { x: X(25), y: 33, r: 16 });
    L.zones.push(Z('bed', 'soil', X(18), 82, 10, 20, 3), Z('meadow', 'grass', X(62), 92, 6, 12, 1));
    L.zones.push(Z('meadow', 'grass', X(106), 88, 14, 14, 2), Z('meadow', 'grass', X(84), 36, 8, 10, 1));
    L.fx.bees.push([X(108), 30], [X(20), 70]);
    return L;
  },
  teich(rnd, X) {
    const L = base();
    const px = 46 + int(rnd, -3, 3), py = 70, prx = 31 + int(rnd, 0, 4), pry = 18 + int(rnd, 0, 2);
    L.feat.pond = { x: X(px), y: py, rx: prx, ry: pry };
    L.feat.jetty = { x: Math.min(X(px + 4), X(px + 13)), y: py + 6, w: 9, h: 20 };
    L.blocks.push({ ell: [X(px), py, prx + 9, pry + 6] }, { rect: [Math.min(X(px + 4), X(px + 13)) - 6, py, 21, 32] });
    L.wp = [X(100), 60];
    L.ctrl = { L: [X(44), 22], R: [X(114), 58], T: [X(76), 30], B: [X(96), 100] };
    L.statics.push(st('reeds', X(px - prx + 6), py - 4, { v: 0 }), st('reeds', X(px - prx + 12), py + pry - 3, { v: 1 }), st('reeds', X(px + prx - 4), py - 7, { v: 1, flip: true }));
    L.statics.push(st('duck', X(px - 6), py - 4, { v: 0 }), st('duck', X(px - 1), py - 1, { v: 2 }), st('duck', X(px + 16), py + 6, { v: 1, flip: true }));
    L.statics.push(st('lamppost', X(px + 12), py + 6, { flip: X(0) !== 0 }));
    L.lights.push({ x: X(px + 17), y: py - 6, r: 22 });
    L.zones.push(Z('bank', 'grass', 0, 0, 0, 0, 5, { ring: [X(px), py, prx, pry], pad: 7 }));
    L.zones.push(Z('meadow', 'grass', X(108), 92, 12, 12, 2), Z('meadow', 'grass', X(20), 34, 10, 8, 1));
    L.feat.tall.push({ x: X(px - 30), y: py + 18, rx: 16, ry: 10 }, { x: X(px + 30), y: py - 14, rx: 12, ry: 7 });
    L.fx.flies.push([X(px), py], [X(px - 20), py + 8], [X(px + 22), py - 6], [X(px - 10), py - 14]);
    return L;
  },
  obst(rnd, X) {
    const L = base();
    const v = int(rnd, 0, 2);
    L.statics.push(st('tree', X(40), 54, { v: v === 1 ? 0 : v }));
    L.statics.push(st('swing', X(22), 70, { len: 40 }));
    L.statics.push(st('bench', X(62), 60, { flip: false }));
    L.statics.push(st('treeS', X(106), 40, { v: v === 1 ? 1 : 3 }));
    L.wp = [X(88), 82];
    L.ctrl = { L: [X(30), 92], R: [X(112), 74], T: [X(78), 30], B: [X(80), 102] };
    L.feat.fruit = { x: X(40), y: 58, col: v };
    L.feat.shadows.push({ x: X(48), y: 56, rx: 26, ry: 8 }, { x: X(112), y: 42, rx: 16, ry: 5 });
    L.feat.mown.push({ x: X(52), y: 70, rx: 34, ry: 16 });
    L.lights.push({ x: X(64), y: 33, r: 20 });
    L.zones.push(Z('meadow', 'grass', X(40), 96, 22, 10, 3), Z('meadow', 'grass', X(110), 96, 12, 12, 2));
    L.zones.push(Z('meadow', 'grass', X(112), 66, 8, 8, 1), Z('meadow', 'grass', X(80), 56, 6, 6, 1));
    L.feat.blooms.push({ x: X(20), y: 98, rx: 14, ry: 8, col: 0 });
    return L;
  },
  feld(rnd, X, ctx) {
    const L = base();
    const fx0 = rnd() < 0.5 ? 0 : int(rnd, 10, 40), fx1 = rnd() < 0.5 ? SW : SW - int(rnd, 10, 40);
    const fd = int(rnd, -4, 6);
    L.feat.field = { y0: 0, y1: 36 + fd, x0: fx0, x1: fx1 };
    const fy = 50 + fd;
    // Rosenbogen dort, wo ein Pfad von oben den Zaun kreuzt (sonst an fester Stelle)
    const gx = ctx.crossX(fy) ?? X(84);
    const segs = [[4, gx - 15], [gx + 15, SW - 4]];
    for (const [a0, b0] of segs) { const a = Math.max(a0, fx0 + 2), b = Math.min(b0, fx1 - 4); if (b - a > 6) L.statics.push({ kind: 'fence', x: a, y: fy, len: b - a, z: fy }); }
    L.statics.push(st('gate', gx, fy + 1));
    L.statics.push(st('scarecrow', gx > 64 ? Math.max(fx0 + 16, 30) : Math.min(fx1 - 16, 98), 30, { flip: rnd() < 0.5 }));
    L.lights.push({ x: gx, y: fy - 14, r: 20 });
    L.wp = [X(70), 78];
    L.ctrl = { L: [X(30), 70], R: [X(104), 72], T: [X(66), 40], B: [X(64), 98] };
    L.zones.push(Z('field', 'grain', (fx0 + fx1) / 2, 30 + fd, (fx1 - fx0) / 2 - 8, 3, 3), Z('fence', 'grass', 64, 61 + fd, 58, 3, 3));
    L.zones.push(Z('meadow', 'grass', X(24), 96, 16, 10, 2), Z('meadow', 'grass', X(104), 98, 16, 10, 1));
    L.feat.blooms.push({ x: X(100), y: 88, rx: 14, ry: 8, col: 2 });
    L.fx.flies.push([X(30), 90]);
    return L;
  },
  mauer(rnd, X, ctx) {
    const L = base();
    const wy = 50 + int(rnd, -4, 6);
    const gx = ctx.crossX(wy) ?? X(88);
    const segs = [[2, gx - 9], [gx + 9, SW - 3]];
    for (const [a, b] of segs) if (b - a > 6) L.statics.push({ kind: 'wall', x: a, y: wy, len: b - a, z: wy, v: a });
    L.statics.push(st('sign', gx + (gx < 64 ? 14 : -14), wy + 18, { flip: gx > 64 }));
    if (rnd() < 0.6) L.statics.push({ prop: 'catsit', v: int(rnd, 0, 2), x: gx < 64 ? 100 : 28, y: wy - 10, z: wy + 0.2 });
    L.statics.push(st('lamppost', X(118), 92, { flip: X(0) !== 0 }));
    L.lights.push({ x: X(123), y: 74, r: 22 });
    L.wp = [X(66), 86];
    L.ctrl = { L: [X(26), 84], R: [X(100), 86], T: [X(64), 40], B: [X(64), 100] };
    L.feat.tall.push({ x: X(40), y: wy - 22, rx: 34, ry: 12 }, { x: X(104), y: wy - 24, rx: 22, ry: 10 });
    L.zones.push(Z('wall', 'grass', 64, wy + 9, 58, 4, 4), Z('meadow', 'grass', 64, wy - 20, 56, 4, 2));
    L.zones.push(Z('meadow', 'grass', X(24), 100, 14, 8, 1), Z('meadow', 'grass', X(98), 102, 16, 6, 1));
    L.fx.flies.push([X(40), 26], [X(100), 24]);
    return L;
  },
  picknick(rnd, X) {
    const L = base();
    const bx = Math.min(X(28), X(62)), by = 62;
    L.feat.blanket = { x: bx, y: by, w: 34, h: 19 };
    L.blocks.push({ rect: [bx - 8, by - 2, 50, 26] });
    L.statics.push(st('basket', X(54), by + 8));
    L.statics.push({ prop: 'teacup', v: 1, x: X(36), y: by + 9, z: by + 9 }, { prop: 'teacup', v: 2, x: X(42), y: by + 15, z: by + 15 });
    L.statics.push(st('plate', X(46), by + 8));
    L.statics.push({ prop: 'lantern', v: 0, x: X(32), y: by + 17, z: by + 17 });
    L.wp = [X(94), 74];
    L.ctrl = { L: [X(44), 40], R: [X(112), 70], T: [X(82), 32], B: [X(82), 100] };
    L.feat.mown.push({ x: X(46), y: 72, rx: 30, ry: 18 });
    L.feat.blooms.push({ x: X(20), y: 98, rx: 16, ry: 9, col: 3 }, { x: X(104), y: 40, rx: 14, ry: 8, col: 0 });
    L.feat.tall.push({ x: X(112), y: 100, rx: 14, ry: 8 });
    L.zones.push(Z('meadow', 'grass', X(22), 36, 14, 8, 2), Z('meadow', 'grass', X(44), 100, 26, 6, 2));
    L.zones.push(Z('meadow', 'grass', X(110), 98, 12, 8, 1), Z('meadow', 'grass', X(108), 38, 12, 10, 2));
    L.fx.butter.push([X(20), 90], [X(104), 34]);
    return L;
  },
  garten(rnd, X) {
    const L = base();
    const bx = Math.min(X(10), X(52)), by = 48;
    L.feat.bed = [{ x: bx, y: by, w: 42, h: 38 }];
    L.statics.push(st('hive', X(94), 38, { v: 1 }), st('hive', X(108), 42, { v: 0 }), st('hive', X(120), 36, { v: 2 }));
    L.statics.push(st('birdhouse', X(70), 44, { flip: rnd() < 0.5 }));
    L.statics.push({ prop: 'can', v: int(rnd, 0, 2), x: X(60), y: 96, z: 96, flip: rnd() < 0.5 });
    L.wp = [X(90), 70];
    L.ctrl = { L: [X(40), 98], R: [X(112), 66], T: [X(80), 34], B: [X(84), 98] };
    L.feat.mown.push({ x: X(100), y: 60, rx: 26, ry: 14 });
    L.feat.blooms.push({ x: X(108), y: 98, rx: 14, ry: 8, col: 1 });
    L.zones.push(Z('bed', 'soil', X(31), 66, 15, 14, 4), Z('meadow', 'grass', X(108), 96, 14, 10, 2), Z('meadow', 'grass', X(24), 102, 10, 6, 1));
    L.fx.bees.push([X(104), 30], [X(30), 60], [X(36), 72]);
    return L;
  },
};
function base() {
  return { wp: [64, 60], ctrl: {}, statics: [], blocks: [], zones: [], extra: [], lights: [],
    feat: { tall: [], blooms: [], mown: [], shadows: [], bed: null }, fx: { flies: [], bees: [], butter: [] } };
}
const st = (kind, x, y, o = {}) => ({ kind, x, y, z: y, v: 0, flip: false, ...o });
const Z = (kind, ground, x, y, rx, ry, n, o = {}) => ({ kind, ground, x, y, rx, ry, n, ...o });

// --- Abschnitt i (rein) ----------------------------------------------------------
function buildSection(i) {
  const [c, r] = cellOf(i);
  const type = typeOf(i);
  const mirror = i === 0 ? false : rng(`bw:mirror:${i}`)() < 0.5;
  const X = (x) => (mirror ? SW - x : x);
  const par = parentOf(i);
  const P = ports(c, r);
  // Pfad von oben (falls Eltern oben): Kurve wird erst nach dem Layout bekannt –
  // Kreuzungspunkt mit Zaun/Mauer über die Layout-Kontrollpunkte vorab berechnen.
  const rnd = rng(`bw:sec:${i}`);
  const pre = LAYOUT[type](rng(`bw:sec:${i}`), X, { crossX: () => null });
  const tCurve = par && par[0] === 'T' ? bez(P.T, pre.ctrl[mirror ? SWAP.T : 'T'] || pre.ctrl.T, pre.wp, 1) : null;
  const crossX = (y) => {
    if (!tCurve) return null;
    let best = null;
    for (const [x, yy] of tCurve) if (!best || Math.abs(yy - y) < Math.abs(best[1] - y)) best = [x, yy];
    return Math.round(Math.max(18, Math.min(SW - 18, best[0])));
  };
  const L = LAYOUT[type](rnd, X, { crossX });

  // Pfadkurven je Seite (Welt der Section, lokal)
  const corr = {};
  for (const s of ['L', 'R', 'T', 'B']) {
    const ls = mirror ? SWAP[s] : s;
    const cp = L.ctrl[ls] || [(P[s][0] + L.wp[0]) / 2, (P[s][1] + L.wp[1]) / 2];
    corr[s] = { p0: P[s], c: cp, p1: L.wp };
  }
  // reservierte Kurven: Eltern-Seite + rechts/unten (mögliche Kinder)
  const used = [...(par ? [par[0]] : []), 'R', 'B'];
  const paths = [...used.map((s) => bez(corr[s].p0, corr[s].c, corr[s].p1)), ...L.extra.map((e) => bez(e.p0, e.c, e.p1))];
  const pathPts = paths.flat();
  const nearPath = (x, y, dx = 11, dy = 7) => pathPts.some(([px, py]) => Math.abs(px - x) < dx && Math.abs(py - y) < dy);

  const statics = L.statics;
  const sboxes = statics.map((p) => ({ box: boxOf(p), z: p.z, kind: p.kind || p.prop }));
  const inBlock = (x, y) => L.blocks.some((b) => {
    if (b.ell) { const [cx, cy, rx, ry] = b.ell; return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1; }
    const [bx, by, bw, bh] = b.rect; return x >= bx && x < bx + bw && y >= by && y < by + bh;
  });
  const okSpot = (x, y) => {
    if (x < 9 || x > SW - 9 || y < 24 || y > SH - 2) return false;
    if (inBlock(x, y) || nearPath(x, y)) return false;
    const pb = plantBox({ x, y });
    for (const s of sboxes) {
      // Fuß nicht auf/zwischen Teilen
      if (x > s.box.x0 - 7 && x < s.box.x1 + 7 && y > s.box.y1 - 5 && y < s.box.y1 + 5) return false;
      if (x > s.box.x0 - 4 && x < s.box.x1 + 4 && y > s.box.y0 && y <= s.box.y1) return false;
      // Teil davor darf die Pflanze nicht verdecken
      if (s.z > y && overlaps(pb, s.box)) return false;
    }
    return true;
  };

  // Stellplätze: Gruppen in den Zonen + entlang des Pfads
  const spots = [];
  const tooClose = (x, y) => spots.some((s) => (Math.abs(s.x - x) <= 16 && Math.abs(s.y - y) <= 21) || Math.hypot(s.x - x, s.y - y) < 18);
  const place = (z, sample) => {
    let got = 0;
    for (let t = 0; t < z.n * 40 && got < z.n; t++) {
      const [x, y] = sample().map(Math.round);
      if (!okSpot(x, y) || tooClose(x, y)) continue;
      spots.push({ x, y, kind: z.kind, ground: z.ground });
      got++;
    }
  };
  for (const z of L.zones) {
    if (z.ring) {
      const [cx, cy, rx, ry] = z.ring;
      place(z, () => { const a = rnd() * Math.PI * 2; return [cx + Math.cos(a) * (rx + z.pad + 2), cy + Math.sin(a) * (ry + z.pad)]; });
    } else place(z, () => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()); return [z.x + Math.cos(a) * z.rx * d, z.y + Math.sin(a) * z.ry * d]; });
  }
  // Wegrand: je reservierter Kurve ein, zwei Plätze seitlich daneben
  paths.forEach((pts, k) => {
    place({ kind: 'path', ground: 'grass', n: k === 0 ? 2 : 1 }, () => {
      const j = 2 + Math.floor(rnd() * (pts.length - 4));
      const [x0, y0] = pts[j - 1], [x1, y1] = pts[j + 1];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1, side = rnd() < 0.5 ? -1 : 1, d = 12 + rnd() * 4;
      return [pts[j][0] - ((y1 - y0) / len) * d * side, pts[j][1] + ((x1 - x0) / len) * d * side];
    });
  });

  // Streu-Deko (weicht Pflanzen): Grasbüschel, Blümchen, Steine, Pusteblumen, Pilze
  const deco = [];
  const near = type === 'obst' ? [[0.3, 'shroom']] : [];
  const kinds = [[0.34, 'tuft'], [0.24, 'flowers'], [0.12, 'stone'], [0.16, 'puff'], ...near];
  for (let t = 0; t < 26 && deco.length < 9; t++) {
    let u = rnd() * kinds.reduce((a, [w]) => a + w, 0), kind = kinds[0][1];
    for (const [w, k] of kinds) if ((u -= w) <= 0) { kind = k; break; }
    const x = 6 + Math.floor(rnd() * (SW - 12)), y = 10 + Math.floor(rnd() * (SH - 12));
    const v = Math.floor(rnd() * 3), flip = rnd() < 0.5;
    const p = kind === 'tuft' || kind === 'stone' ? { prop: kind, v, x, y, flip } : { kind, v, x, y, flip };
    const bx = boxOf(p);
    if (inBlock(x, y) || nearPath(x, y, 8, 5)) continue;
    if (sboxes.some((s) => overlaps(s.box, { x0: bx.x0 - 2, x1: bx.x1 + 2, y0: bx.y0 - 2, y1: bx.y1 + 2 }))) continue;
    if (deco.some((d) => overlaps(d.box, { x0: bx.x0 - 3, x1: bx.x1 + 3, y0: bx.y0 - 3, y1: bx.y1 + 3 }))) continue;
    if (L.feat.pond && ((x - L.feat.pond.x) / (L.feat.pond.rx + 8)) ** 2 + ((y - L.feat.pond.y) / (L.feat.pond.ry + 6)) ** 2 < 1) continue;
    deco.push({ ...p, box: bx });
  }

  // zusätzliche Bodenflecken (hohes Gras, Blumenteppich) zufällig
  for (let k = 0; k < 2; k++) {
    const x = 14 + Math.floor(rnd() * (SW - 28)), y = 18 + Math.floor(rnd() * (SH - 30));
    if (inBlock(x, y)) continue;
    if (rnd() < 0.5) L.feat.tall.push({ x, y, rx: 8 + int(rnd, 0, 8), ry: 5 + int(rnd, 0, 4) });
    else L.feat.blooms.push({ x, y, rx: 8 + int(rnd, 0, 8), ry: 5 + int(rnd, 0, 3), col: int(rnd, 0, 3) });
  }

  return {
    rect: { x: c * SW, y: r * SH, w: SW, h: SH }, c, r, type, mirror,
    parent: par, wp: L.wp, corr, extra: L.extra, feat: L.feat, lights: L.lights, fx: L.fx,
    statics: statics.map((p) => ({ ...p })), deco,
    spots: spots.map((s) => ({ ...s, z: s.y })),
  };
}

const memo = new Map();
function section(i) {
  if (!memo.has(i)) memo.set(i, buildSection(i));
  return JSON.parse(JSON.stringify(memo.get(i)));
}

// Deko auf freien Stellplätzen (verschwindet, sobald dort eine Pflanze wächst)
const FREE = {
  bed: [0.75, ['sprout', 'sprout', 'can', 'sprout', 'shroom']],
  bank: [0.55, ['tuft', 'stone', 'flowers', 'tuft']],
  field: [0.4, ['flowers', 'tuft']],
  fence: [0.7, ['flowers', 'puff', 'rabbit', 'tuft', 'can']],
  wall: [0.7, ['flowers', 'stone', 'hedgehog', 'tuft']],
  path: [0.45, ['stone', 'tuft', 'flowers', 'puff']],
  meadow: [0.6, ['flowers', 'puff', 'rabbit', 'hedgehog', 'shroom', 'tuft', 'flowers', 'puff']],
};
const PROPS = new Set(['tuft', 'stone', 'can']);

export default {
  id: 'blumenwiese',
  anchor: 'bottom',
  pad: PAD,
  minSections: 2,
  maxFill: 40,

  section,

  pieces(scene) {
    const out = [];
    const taken = new Set(scene.items.map((it) => it.spot.key));
    for (const s of scene.sections) {
      const ox = s.rect.x, oy = s.rect.y;
      for (const p of s.statics) out.push({ ...p, x: p.x + ox, y: p.y + oy, z: p.z + oy });
      for (const d of s.deco) {
        const { box, ...p } = d;
        out.push({ ...p, x: p.x + ox, y: p.y + oy, z: p.y + oy - 0.01, yield: true, box: { x0: box.x0 + ox, x1: box.x1 + ox, y0: box.y0 + oy, y1: box.y1 + oy } });
      }
      let critter = false;
      for (const sp of s.spots) {
        if (taken.has(sp.key)) continue;
        const [p, list] = FREE[sp.kind] || FREE.meadow;
        const r2 = rng(`bw:free:${sp.key}`);
        if (r2() > p) continue;
        let name = pick(r2, list);
        if (name === 'rabbit' || name === 'hedgehog') { if (critter) name = 'flowers'; critter = true; }
        const v = Math.floor(r2() * 3), flip = r2() < 0.5;
        const x = sp.x + Math.round((r2() - 0.5) * 4), y = sp.y;
        const piece = PROPS.has(name) ? { prop: name, v, x, y } : { kind: name, v, x, y };
        out.push({ ...piece, z: sp.z, flip, spot: sp.key, yield: true, box: boxOf({ ...piece, flip }) });
      }
    }
    return out;
  },

  front(scene) {
    // hohe Halme am unteren Rand und an den Seiten (weichen Pflanzen aus)
    const out = [];
    const { W, H, ox } = scene;
    const add = (x, y, v, flip) => {
      const p = { kind: 'blades', v, x, y, z: y + 1000, flip };
      out.push({ ...p, yield: true, box: boxOf(p) });
    };
    for (let k = Math.floor(-ox / 13) - 1; k * 13 + ox < W + 13; k++) {
      const rr = rng(`bw:front:${k}`);
      if (rr() < 0.25) continue;
      add(k * 13 + ox + int(rr, -3, 3), H + int(rr, 0, 4), int(rr, 0, 3), rr() < 0.5);
    }
    for (const s of scene.sections) {
      if (s.c !== 0) continue;
      const rr = rng(`bw:frontL:${s.r}`);
      if (rr() < 0.7) add(s.rect.x - 2, s.rect.y + 40 + int(rr, 0, 50), int(rr, 0, 3), false);
    }
    return out;
  },

  sprite(p) {
    const b = BUILD[p.kind];
    return b ? sprite(`bw|${p.kind}|${p.v || 0}|${p.len ?? ''}`, () => b(p.v || 0, p)) : null;
  },

  paint(scene) {
    return paintMeadow(scene);
  },
};

// --- Hintergrund ---------------------------------------------------------------------

function paintMeadow(scene) {
  const { W, H, ox, oy } = scene;
  const b = new Buf(W, H);
  const halos = [], fireflies = [], critters = [];
  const seed = 7151;
  const hz = oy; // Inhalt y = 0: Beginn der Wiese

  // Horizont: Himmel (durchsichtig), ferne Hügel, Baumreihe/Hecke
  const top = new Int16Array(W);
  for (let x = 0; x < W; x++) {
    const cx = x - ox;
    const far = hz - 34 + Math.round(Math.sin(cx / 41 + 1.2) * 6 + Math.sin(cx / 17 + 0.4) * 2);
    const near = hz - 16 + Math.round(Math.sin(cx / 29 + 3.1) * 4 + Math.sin(cx / 11) * 1.4);
    for (let y = Math.max(0, far); y < near && y < H; y++) {
      const k = y - far;
      b.set(x, y, k === 0 ? FAR[3] : noise(cx >> 1, (y - hz) >> 1, seed) > 0.82 ? FAR[1] : k < 3 ? mix(FAR[2], FAR[3], 0.5) : FAR[2]);
    }
    for (let y = Math.max(0, near); y < hz - 3 && y < H; y++) {
      const k = y - near;
      b.set(x, y, k === 0 ? NEAR[3] : noise(cx >> 1, (y - hz) >> 1, seed + 1) > 0.78 ? NEAR[1] : NEAR[2]);
    }
    top[x] = Math.max(0, hz - 3 - Math.round(Math.abs(Math.sin(cx / 5.3)) * 2));
  }
  // Bäume, Höfe und Büsche auf den Hügeln (Inhaltskoordinaten → stabil)
  for (let k = Math.floor(-ox / 30) - 1; k * 30 + ox < W + 30; k++) {
    const rr = rng(`bw:backdrop:${k}`);
    const x = k * 30 + ox + int(rr, 0, 18);
    const cx = x - ox;
    const baseY = hz - 16 + Math.round(Math.sin(cx / 29 + 3.1) * 4 + Math.sin(cx / 11) * 1.4) + 2;
    const kind = rr();
    if (kind < 0.18) {
      const w = 9 + int(rr, 0, 4), h = 6 + int(rr, 0, 2);
      b.rect(x, baseY - h, w, h + 1, rr() < 0.5 ? R.plaster[1] : R.plaster[2]);
      for (let j = 0; j < 4; j++) b.hline(x - 1 + j, x + w - j, baseY - h - 1 - j, R.roof[j === 0 ? 0 : 1]);
      const wx = x + 2 + int(rr, 0, w - 5), wy = baseY - h + 2;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) b.glow(wx + dx, wy + dy, dy ? C.lamp[1] : C.lamp[2]);
      halos.push({ x: wx + 1, y: wy + 1, r: 6, rgb: [255, 200, 120], a: 0.3 });
    } else if (kind < 0.8) {
      const r = 4 + int(rr, 0, 4), ty = baseY - 3 - r;
      b.rect(x, ty + r - 1, 2, 5, C.wood[1]);
      b.ellipse(x + 1, ty, r, r * 0.9, NEAR[0]);
      b.ellipse(x + 1, ty, r - 1, r * 0.9 - 1, NEAR[2]);
      b.ellipse(x - 1, ty - 2, r * 0.5, r * 0.4, NEAR[3]);
    }
  }

  // Wiese
  const tones = [MEADOW[1], mix(MEADOW[1], MEADOW[2], 0.5), MEADOW[2], mix(MEADOW[2], MEADOW[3], 0.5), MEADOW[3]];
  for (let x = 0; x < W; x++)
    for (let y = top[x]; y < H; y++) {
      const cx = x - ox, cy = y - oy;
      const hill = vnoise(cx, cy, 88, seed + 3) * 0.7 + vnoise(cx, cy, 36, seed + 4) * 0.3;
      let t = Math.floor(Math.min(0.999, Math.max(0, (hill - 0.2) / 0.6)) * 4 + bayer(cx, cy) * 0.9 - 0.2);
      t = Math.max(0, Math.min(4, t));
      let col = tones[t];
      const n = noise(cx, cy, seed);
      if (n > 0.94) col = mix(col, MEADOW[4], 0.6);
      else if (n < 0.035) col = mix(col, MEADOW[0], 0.55);
      // Wolkenschatten (weich gerastert)
      const cs = vnoise(cx + 13, cy * 1.4, 64, seed + 9);
      if (cs > 0.7 + bayer(cx + 1, cy) * 0.05) col = mix(col, [34, 62, 54], 0.2);
      b.set(x, y, col);
    }
  // Halme
  for (let x = 0; x < W; x++)
    for (let y = top[x] + 2; y < H; y++) {
      const cx = x - ox, cy = y - oy;
      if (noise(cx, cy, seed + 5) > 0.975) {
        const g = b.get(x, y);
        b.set(x, y, mix(g, MEADOW[4], 0.5));
        b.set(x, y - 1, mix(g, MEADOW[4], 0.25));
        b.set(x + (noise(cx, cy, 2) > 0.5 ? 1 : -1), y + 1, mix(g, MEADOW[0], 0.35));
      } else if (noise(cx, cy, seed + 6) > 0.9985) {
        b.set(x, y, pick(() => noise(cx, cy, 77), [C.petal_white[3], C.petal_yellow[3], C.petal_pink[3], C.petal_white[4]]));
      }
    }
  // Hecke am Wiesenrand mit Blüten
  for (let x = 0; x < W; x++) {
    const cx = x - ox;
    const h = 3 + Math.round(Math.abs(Math.sin(cx / 5.3)) * 2 + Math.sin(cx / 2.3) * 0.6);
    for (let k = 0; k < h; k++) {
      const y = hz - 3 + k - Math.round(Math.abs(Math.sin(cx / 5.3)) * 2);
      if (y < 0 || y >= H) continue;
      b.set(x, y, k === 0 ? NEAR[3] : noise(cx, y - hz, seed + 7) > 0.7 ? NEAR[1] : NEAR[2]);
    }
    const yb = hz + h - 3 - Math.round(Math.abs(Math.sin(cx / 5.3)) * 2);
    if (yb >= 0 && yb < H) b.set(x, yb, mix(NEAR[0], MEADOW[1], 0.4));
    if (noise(cx, 1, seed + 8) > 0.9) b.set(x, hz - 2, noise(cx, 2, seed) > 0.5 ? C.petal_white[3] : C.petal_pink[3]);
  }

  const secs = scene.sections;
  const W2 = (s, x, y) => [s.rect.x + x, s.rect.y + y];
  // Bodenflecken: gemäht, hohes Gras, Blumenteppiche
  for (const s of secs) for (const m of s.feat.mown) patch(b, ...W2(s, m.x, m.y), m.rx, m.ry, s.index * 7 + 1, (x, y, g) => (y % 4 < 2 ? mix(g, MEADOW[3], 0.35) : mix(g, MEADOW[3], 0.18)));
  for (const s of secs) for (const t of s.feat.tall) tallGrass(b, ...W2(s, t.x, t.y), t.rx, t.ry, s.index * 7 + 2, fireflies, s);
  for (const s of secs) for (const f of s.feat.blooms) blooms(b, ...W2(s, f.x, f.y), f.rx, f.ry, f.col, s.index * 7 + 3, ox, oy);
  // Schatten unter Bäumen und Teilen (rechts unten)
  for (const s of secs) {
    for (const sh of s.feat.shadows) shade(b, ...W2(s, sh.x, sh.y), sh.rx, sh.ry, 0.22);
    for (const p of s.statics) {
      const [x, y] = W2(s, p.x, p.y);
      const k = p.kind;
      if (k === 'cottage') shade(b, x + 4, y + 1, 31, 4, 0.3);
      else if (['hive', 'barrel', 'basket', 'birdhouse', 'sign', 'lamppost', 'scarecrow', 'bench', 'gate'].includes(k)) shade(b, x + 2, y, k === 'bench' ? 13 : 6, 2, 0.25);
      else if (k === 'fence' || k === 'wall') for (let i = 0; i < p.len; i++) shade(b, x + i + 2, y + 1, 1, 1.4, k === 'wall' ? 0.3 : 0.2);
    }
  }
  // Orte
  for (const s of secs) {
    const f = s.feat;
    if (f.field) field(b, s, f.field, ox, oy);
    if (f.bed) for (const bd of f.bed) bed(b, s.rect.x + bd.x, s.rect.y + bd.y, bd.w, bd.h, s.index);
    if (f.pond) pond(b, s, f.pond, f.jetty, halos);
    if (f.blanket) blanket(b, s.rect.x + f.blanket.x, s.rect.y + f.blanket.y, f.blanket.w, f.blanket.h);
    if (f.fruit) for (let k = 0; k < 6; k++) {
      const r2 = rng(`bw:fruit:${s.index}:${k}`);
      const x = s.rect.x + f.fruit.x - 16 + int(r2, 0, 34), y = s.rect.y + f.fruit.y + int(r2, 0, 8);
      const col = [C.cap_red, C.petal_pink, C.petal_yellow][f.fruit.col];
      b.set(x, y, col[2]); b.set(x + 1, y, col[1]); b.set(x, y - 1, col[3]);
    }
  }
  // Pfade
  const mask = new Uint8Array(W * H);
  const stones = [];
  const stamp = (pts, wseed) => pts.forEach(([x, y], k) => {
    const r = 2.6 + vnoise(k, 0, 9, wseed) * 1.2;
    for (let j = Math.floor(y - r); j <= Math.ceil(y + r); j++)
      for (let i = Math.floor(x - r - 0.5); i <= Math.ceil(x + r + 0.5); i++) {
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        if (((i + 0.5 - x) / (r + 0.6)) ** 2 + ((j + 0.5 - y) / r) ** 2 <= 1) mask[j * W + i] = 1;
      }
  });
  const byIdx = new Map(secs.map((s) => [s.index, s]));
  for (const s of secs) {
    const pts = (cv) => bez(cv.p0, cv.c, cv.p1, 1).map(([x, y]) => [s.rect.x + x, s.rect.y + y]);
    if (s.parent) {
      const [side, pi] = s.parent;
      const p = byIdx.get(pi);
      stamp(pts(s.corr[side]), s.index + 11);
      if (p) stamp(bez(p.corr[OPP[side]].p0, p.corr[OPP[side]].c, p.corr[OPP[side]].p1, 1).map(([x, y]) => [p.rect.x + x, p.rect.y + y]), p.index + 17);
    }
    // Knoten: kleine ausgetretene Stelle
    const [wx, wy] = W2(s, s.wp[0], s.wp[1]);
    stamp([[wx, wy], [wx + 2, wy], [wx - 2, wy]], s.index + 5);
    for (const e of s.extra) {
      const pp = bez(e.p0, e.c, e.p1, 5).map(([x, y]) => [s.rect.x + x, s.rect.y + y]);
      if (e.stones) stones.push(...pp.slice(0, -1));
      else stamp(pp, s.index + 23);
    }
  }
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      if (!mask[y * W + x]) {
        if (mask[(y - 1) * W + x] || mask[y * W + x - 1]) b.set(x, y, mix(b.get(x, y) || MEADOW[1], MEADOW[0], 0.4));
        continue;
      }
      const cx = x - ox, cy = y - oy;
      const edgeTop = !mask[(y - 1) * W + x], edgeL = !mask[y * W + x - 1], edgeB = !mask[(y + 1) * W + x], edgeR = !mask[y * W + x + 1];
      const n = noise(cx, cy, seed + 31);
      let col = n > 0.8 ? PATH[3] : n < 0.12 ? mix(PATH[2], PATH[1], 0.5) : PATH[2];
      if (edgeTop || edgeL) col = mix(PATH[1], MEADOW[2], 0.35);
      else if (edgeB || edgeR) col = PATH[3];
      else if (n > 0.975) col = C.stone[3];
      if ((edgeTop || edgeB) && noise(cx, cy, seed + 32) > 0.6) col = MEADOW[3];
      b.set(x, y, col);
    }
  for (const [x, y] of stones) {
    const sx = Math.round(x), sy = Math.round(y);
    b.ellipse(sx + 0.5, sy + 0.5, 3.2, 2.1, C.stone[1]);
    b.ellipse(sx + 0.5, sy, 2.6, 1.6, C.stone[2]);
    b.set(sx - 1, sy - 1, C.stone[3]); b.set(sx, sy - 1, C.stone[3]);
  }

  // Lichter (Laternen, Fenster) und Leben
  for (const s of secs) {
    for (const l of s.lights) halos.push({ x: s.rect.x + l.x, y: s.rect.y + l.y, r: l.r, rgb: [255, 196, 116], a: 0.34 });
    const rr = rng(`bw:fx:${s.index}`);
    for (const [x, y] of s.fx.flies) for (let k = 0; k < 3; k++) fireflies.push({ x: s.rect.x + x + int(rr, -10, 10), y: s.rect.y + y + int(rr, -6, 6), p: rr() * 7 });
    for (let k = 0; k < 3; k++) fireflies.push({ x: s.rect.x + int(rr, 10, SW - 10), y: s.rect.y + int(rr, 14, SH - 6), p: rr() * 7 });
    for (const [x, y] of s.fx.bees) critters.push({ x: s.rect.x + x, y: s.rect.y + y, p: rr() * 7, bee: true });
    const wings = [[C.petal_white[3], C.petal_white[2]], [C.petal_yellow[3], C.petal_yellow[2]], [C.petal_orange[3], C.petal_orange[1]], [C.petal_blue[3], C.petal_blue[2]]];
    const nB = s.fx.butter.length ? s.fx.butter : [[int(rr, 20, SW - 20), int(rr, 24, SH - 20)]];
    for (const [x, y] of nB) {
      if (rr() < 0.25 && !s.fx.butter.length) continue;
      const w = wings[int(rr, 0, 3)];
      critters.push({ x: s.rect.x + x, y: s.rect.y + y, p: rr() * 7, bee: false, rgb: w[0], rgb2: w[1] });
    }
  }
  const { canvas, glow } = b.finish();
  return { canvas, glow, halos, fx: { fireflies, critters }, sky: true, skySeed: 23, outside: [60, 110, 60] };
}

/** Fleck mit ausgefranstem Rand; fn(x, y, alteFarbe) → neue Farbe */
function patch(b, cx, cy, rx, ry, seed, fn) {
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++)
    for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1 + (noise(x >> 1, y >> 1, seed) - 0.5) * 0.7) continue;
      const g = b.get(x, y);
      if (g) b.set(x, y, fn(x, y, g, d));
    }
}

function tallGrass(b, cx, cy, rx, ry, seed) {
  patch(b, cx, cy, rx, ry, seed, (x, y, g) => {
    const n = noise(x, Math.floor((y + (x % 3)) / 3), seed);
    const tip = (y + (x % 3)) % 3 === 0;
    if (n > 0.55) return tip ? mix(MEADOW[4], C.leaf[4], 0.3) : mix(MEADOW[3], MEADOW[2], 0.3);
    if (n < 0.2) return MEADOW[0];
    return tip ? MEADOW[2] : mix(MEADOW[1], MEADOW[0], 0.3);
  });
  // Samenstände
  for (let k = 0; k < (rx * ry) / 18; k++) {
    const x = Math.round(cx + (noise(k, 1, seed) - 0.5) * rx * 1.6), y = Math.round(cy + (noise(k, 2, seed) - 0.5) * ry * 1.6);
    b.set(x, y, GRAIN[3]); b.set(x, y + 1, GRAIN[2]);
  }
}

const BLOOM = [
  [C.petal_white[4], C.petal_white[2], C.petal_yellow[3]],
  [C.petal_yellow[4], C.petal_yellow[2], C.petal_yellow[1]],
  [C.petal_blue[3], C.petal_blue[2], C.petal_purple[3]],
  [C.petal_pink[3], C.petal_pink[2], C.petal_white[3]],
];
function blooms(b, cx, cy, rx, ry, col, seed, ox, oy) {
  const [a, s, alt] = BLOOM[col % 4];
  patch(b, cx, cy, rx, ry, seed, (x, y, g, d) => {
    const n = noise(x - ox, y - oy, seed + 1);
    const dens = 0.16 * (1 - d * 0.6);
    if (n < dens * 0.25) return alt;
    if (n < dens) return a;
    if (n < dens + 0.07) return mix(g, MEADOW[3], 0.4);
    return g;
  });
  // Blütenpunkte mit Schatten
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const g = b.get(x, y);
    if (g && (g === a || (g[0] === a[0] && g[1] === a[1] && g[2] === a[2]))) {
      const u = b.get(x, y + 1);
      if (u && !(u[0] === a[0] && u[1] === a[1])) b.set(x, y + 1, s);
    }
  }
}

function shade(b, cx, cy, rx, ry, k) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x + 0.5 - cx) / Math.max(rx, 0.5)) ** 2 + ((y + 0.5 - cy) / Math.max(ry, 0.5)) ** 2 > 1) continue;
      const g = b.get(x, y);
      if (g) b.set(x, y, mix(g, [26, 40, 34], k));
    }
}

function field(b, s, f, ox, oy) {
  const x0 = s.rect.x + Math.max(3, f.x0 ?? 0), x1 = s.rect.x + Math.min(SW - 4, (f.x1 ?? SW) - 1);
  for (let x = x0; x <= x1; x++) {
    const cx = x - ox;
    const edge = Math.round(noise(cx >> 1, 9, 5) * 2);
    const yTop = s.rect.y + f.y0 + 2 + edge, yBot = s.rect.y + f.y1 - Math.round(noise(cx, 3, 5) * 2);
    const lEdge = x - x0 < 3 - noise(0, x - x0, 4) * 2, rEdge = x1 - x < 3 - noise(1, x1 - x, 4) * 2;
    if (lEdge || rEdge) continue;
    for (let y = yTop; y <= yBot; y++) {
      const cy = y - oy;
      const row = Math.floor((cy + (cx % 2)) / 3);
      const n = noise(cx, row, 61);
      let col = (cy + (cx % 2)) % 3 === 0 ? GRAIN[3] : n > 0.7 ? GRAIN[2] : n < 0.15 ? GRAIN[1] : mix(GRAIN[2], GRAIN[3], 0.4);
      if (cx % 4 === 0 && (cy % 3) === 2) col = mix(GRAIN[1], C.leaf[2], 0.3);
      if (y === yTop) col = GRAIN[4];
      else if (y === yBot) col = mix(GRAIN[1], MEADOW[1], 0.5);
      if (noise(cx, cy, 62) > 0.992) col = C.petal_red[3];
      else if (noise(cx, cy, 63) > 0.995) col = C.petal_blue[3];
      b.set(x, y, col);
    }
    b.set(x, yTop - 1, mix(GRAIN[3], MEADOW[2], 0.5));
  }
}

function bed(b, x, y, w, h, idx) {
  // Beet mit Holzeinfassung, Erde in Reihen, kleinen Sämlingen
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = noise(x + i, y + j, 70 + idx);
    let col = (j % 6 === 2 || j % 6 === 3) ? C.soil[3] : n > 0.7 ? C.soil[3] : C.soil[2];
    if (j % 6 === 4) col = C.soil[1];
    if (n > 0.97) col = C.soil[4];
    b.set(x + i, y + j, col);
  }
  for (let i = -1; i <= w; i++) {
    b.set(x + i, y - 2, C.wood[3]); b.set(x + i, y - 1, C.wood[1]);
    b.set(x + i, y + h, C.wood[3]); b.set(x + i, y + h + 1, C.wood[2]); b.set(x + i, y + h + 2, C.wood[0]);
  }
  for (let j = -2; j <= h + 2; j++) { b.set(x - 2, j + y, C.wood[3]); b.set(x - 1, j + y, C.wood[1]); b.set(x + w, j + y, C.wood[2]); b.set(x + w + 1, j + y, C.wood[0]); }
  for (let k = 0; k < (w * h) / 40; k++) {
    const sx = x + 2 + Math.floor(noise(k, 3, idx) * (w - 4)), sy = y + 3 + Math.floor(noise(k, 4, idx) * (h - 5));
    b.set(sx, sy, C.leaf[3]); b.set(sx - 1, sy, C.leaf[2]); b.set(sx + 1, sy - 1, C.leaf[4]);
  }
}

function pond(b, s, p, jet, halos) {
  const cx = s.rect.x + p.x, cy = s.rect.y + p.y;
  const W_ = R.water;
  for (let y = Math.floor(cy - p.ry - 3); y <= cy + p.ry + 3; y++)
    for (let x = Math.floor(cx - p.rx - 4); x <= cx + p.rx + 4; x++) {
      const wob = (noise(x >> 2, y >> 2, 81) - 0.5) * 0.12;
      const d = ((x + 0.5 - cx) / p.rx) ** 2 + ((y + 0.5 - cy) / p.ry) ** 2 + wob;
      const dOut = ((x + 0.5 - cx) / (p.rx + 3)) ** 2 + ((y + 0.5 - cy) / (p.ry + 2.5)) ** 2 + wob;
      if (dOut > 1) continue;
      if (d > 1) { b.set(x, y, y < cy ? mix(C.soil[3], MEADOW[1], 0.35) : mix(C.gh_pumpkin_beige[1], C.soil[3], 0.4)); continue; }
      let col = W_[2];
      const dy = y - cy;
      if (d > 0.8 && dy < 0) col = W_[1];
      else if (d > 0.86) col = mix(W_[2], W_[1], 0.5);
      else if (d < 0.5 && noise(x >> 2, y, 82) > 0.86) col = W_[3];
      if (y === Math.floor(cy - p.ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / p.rx) ** 2))) + 1) col = W_[0];
      b.set(x, y, col);
    }
  // Lichtglanz oben links
  for (const [dx, dy, l] of [[-14, -8, 6], [-8, -5, 4], [6, 4, 5], [-2, 8, 3]]) for (let i = 0; i < l; i++) b.set(cx + dx + i, cy + dy, i % 3 === 1 ? W_[4] : W_[3]);
  // Mondspiegelung (nachts sichtbar)
  for (const [dx, dy, l] of [[8, -4, 5], [9, -2, 3], [7, 0, 4]]) for (let i = 0; i < l; i++) b.glow(cx + dx + i, cy + dy, [200, 210, 236], false);
  // Seerosen
  const rr = rng(`bw:pads:${s.index}`);
  for (let k = 0; k < 6; k++) {
    const a = rr() * Math.PI * 2, d = 0.35 + rr() * 0.45;
    const x = Math.round(cx + Math.cos(a) * p.rx * d), y = Math.round(cy + Math.sin(a) * p.ry * d);
    if (jet && x >= s.rect.x + jet.x - 3 && x <= s.rect.x + jet.x + jet.w + 3 && y > cy) continue;
    b.ellipse(x + 0.5, y + 0.5, 3.2, 2, C.leaf[0]);
    b.ellipse(x + 0.5, y + 0.5, 2.5, 1.4, C.leaf[2]);
    b.set(x - 1, y, C.leaf[3]); b.set(x, y - 1, C.leaf[3]); b.set(x + 1, y, W_[2]); b.set(x + 2, y, W_[2]);
    if (k % 2 === 0) { const pc = k % 4 ? C.petal_white : C.petal_pink; b.set(x - 1, y - 1, pc[3]); b.set(x, y - 2, pc[4]); b.set(x - 1, y - 2, pc[2]); b.set(x, y - 1, C.petal_yellow[3]); }
  }
  // Steg
  if (jet) {
    const jx = s.rect.x + jet.x, jy = s.rect.y + jet.y;
    for (let j = 0; j < jet.h; j++) for (let i = 0; i < jet.w; i++) {
      let col = j % 3 === 2 ? C.wood[1] : i === 0 ? C.wood[3] : i === jet.w - 1 ? C.wood[1] : (noise(i, j, 5) > 0.8 ? C.wood[3] : C.wood[2]);
      if (j % 3 === 0) col = mix(col, C.wood[4], 0.3);
      b.set(jx + i, jy + j, col);
    }
    for (const [px, py] of [[-1, 0], [jet.w, 0], [-1, 9], [jet.w, 9]]) { b.vline(jx + px, jy + py, jy + py + 3, C.wood[0]); }
    for (let i = 0; i < jet.w; i++) b.set(jx + i, jy - 1, C.wood[0]);
    for (let i = -1; i <= jet.w; i++) b.set(jx + i, jy + jet.h, mix(W_[1], C.wood[0], 0.4));
  }
  void halos;
}

function blanket(b, x, y, w, h) {
  const red = C.petal_red, cr = C.cream;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const a = Math.floor(i / 4) % 2, c = Math.floor(j / 3) % 2;
    let col = a && c ? red[2] : a || c ? mix(red[3], cr[3], 0.45) : cr[3];
    if ((i % 4 === 0 || j % 3 === 0) && (a || c)) col = mix(col, red[1], 0.25);
    if (i === 0 || j === 0) col = mix(col, cr[4], 0.3);
    if (i === w - 1 || j === h - 1) col = mix(col, red[1], 0.4);
    b.set(x + i, y + j, col);
  }
  for (let i = 0; i < w; i += 2) { b.set(x + i, y + h, cr[2]); b.set(x + i, y - 1, cr[2]); }
  for (let i = 0; i < w; i++) b.set(x + i + 1, y + h + 1, mix(MEADOW[1], [20, 30, 20], 0.3));
}

// --- Teile (Sprites) ----------------------------------------------------------------

const BUILD = {
  cottage() {
    const a = new PixelArt(58, 54);
    // Schornstein (hinter dem Dach)
    const ch = a.layer(HX.brick);
    ch.rect(40, 1, 6, 12);
    a.layer('stone', { shading: false }).rect(39, 0, 8, 2, LIGHT);
    // Fundament
    a.layer('stone').rect(7, 49, 44, 4);
    // Wände (Putz) mit Fachwerk
    a.layer(HX.plaster).rect(8, 27, 42, 22);
    const tb = a.layer(HX.darkwood, { outline: false, shading: false });
    for (const x of [8, 28, 49]) tb.rect(x, 27, 1, 22, BASE);
    tb.rect(8, 27, 42, 1, SHADE).rect(8, 39, 20, 1, BASE).rect(42, 39, 8, 1, BASE);
    tb.line(9, 47, 12, 40, BASE).line(27, 47, 24, 40, BASE);
    // Kletterrose an der Wand
    const ro = a.layer('leaf', { outline: false, shading: false });
    for (const [x, y] of [[9, 46], [10, 44], [9, 42], [11, 41], [10, 38], [12, 36], [11, 33], [13, 31], [10, 30], [12, 29]]) ro.set(x, y, (x + y) % 2 ? BASE : LIGHT).set(x + 1, y + 1, SHADE);
    const rp = a.layer('petal_pink', { outline: false, shading: false });
    for (const [x, y] of [[10, 43], [12, 37], [11, 32], [13, 29]]) rp.set(x, y, LIGHT).set(x + 1, y, BASE);
    // Fenster links mit Fensterläden und Blumenkasten
    a.layer(HX.shutter).rect(14, 30, 2, 8).rect(25, 30, 2, 8);
    a.layer('wood').rect(16, 30, 9, 8);
    const gl = a.layer('lamp', { outline: false, shading: false, glow: true });
    gl.rect(17, 31, 7, 6, BASE).rect(17, 31, 3, 2, LIGHT).set(17, 31, HIGH);
    const mu = a.layer('wood', { outline: false, shading: false });
    mu.rect(20, 31, 1, 6, SHADE).rect(17, 33, 7, 1, SHADE);
    a.layer('terracotta').rect(15, 39, 11, 2);
    const fb = a.layer('leaf', { outline: false, shading: false });
    for (let x = 15; x <= 25; x++) fb.set(x, 38, x % 2 ? BASE : LIGHT);
    const fl = a.layer('petal_red', { outline: false, shading: false });
    for (const x of [16, 19, 22, 25]) fl.set(x, 37, LIGHT).set(x, 38, BASE);
    a.layer('petal_white', { outline: false, shading: false }).set(18, 37, HIGH).set(23, 37, HIGH);
    // Tür mit Bogen
    const d = a.layer('wood');
    d.rect(33, 37, 8, 12);
    d.rect(34, 36, 6, 1);
    const dp = a.layer('wood', { outline: false, shading: false });
    dp.rect(35, 38, 1, 11, SHADE).rect(38, 38, 1, 11, SHADE).set(39, 43, HIGH);
    a.layer('stone', { shading: false }).rect(31, 50, 12, 2, LIGHT);
    // Laterne neben der Tür
    a.layer('dark').rect(44, 33, 3, 4);
    a.layer('lamp', { outline: false, shading: false, glow: true }).rect(44, 34, 3, 2, BASE).set(44, 34, HIGH);
    // Dach (Ziegel), mit Gaube
    const rf = a.layer(HX.roof);
    for (let y = 6; y <= 26; y++) {
      const ins = Math.round((26 - y) * 0.55);
      for (let x = 2 + ins; x <= 55 - ins; x++) {
        const row = Math.floor((26 - y) / 3), off = row % 2 ? 2 : 0;
        let t = BASE;
        if ((26 - y) % 3 === 0) t = SHADE;
        else if ((x + off) % 4 === 0) t = SHADE;
        else if ((26 - y) % 3 === 2) t = LIGHT;
        if (x === 2 + ins) t = LIGHT;
        rf.set(x, y, t);
      }
    }
    rf.rect(13, 5, 32, 1, HIGH);
    const dm = a.layer(HX.plaster);
    dm.rect(24, 13, 9, 7);
    const dr = a.layer(HX.roof);
    for (let k = 0; k < 4; k++) dr.rect(23 + k, 12 - k, 11 - 2 * k, 1, k ? BASE : LIGHT);
    a.layer('wood').ellipse(28.5, 16.5, 2.6, 2.6);
    a.layer('lamp', { outline: false, shading: false, glow: true }).ellipse(28.5, 16.5, 1.7, 1.7, BASE).set(28, 16, HIGH);
    // Rauch
    const sm = a.layer('petal_white', { outline: false, shading: false });
    sm.set(44, -1, LIGHT);
    return fin(a, 29, 53);
  },
  hive(v) {
    const a = new PixelArt(14, 16);
    a.layer('wood').rect(1, 12, 12, 2);
    const lg = a.layer('wood', { outline: false, shading: false });
    lg.rect(2, 14, 1, 2, SHADE).rect(11, 14, 1, 2, OUTLINE);
    const s = a.layer(HX.straw);
    const rows = [[2, 2], [3, 4], [4, 5], [5, 5], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6]];
    for (const [y, hw] of rows) for (let x = 7 - hw; x < 7 + hw; x++) s.set(x, y, y % 3 === 0 ? SHADE : x < 7 - hw + 2 ? LIGHT : x > 7 + hw - 3 ? SHADE : BASE);
    s.set(6, 1, BASE).set(7, 1, BASE);
    const hi = a.layer(HX.straw, { outline: false, shading: false });
    for (const [x, y] of [[4, 4], [3, 7], [5, 8], [4, 10]]) hi.set(x, y, HIGH);
    a.layer('dark', { outline: false, shading: false }).rect(6, 10, 2, 2, BASE);
    if (v === 2) a.layer('petal_white', { outline: false, shading: false }).set(9, 2, HIGH).set(10, 3, LIGHT);
    return fin(a, 7, 15);
  },
  birdhouse(v) {
    const a = new PixelArt(13, 30);
    a.layer('wood').rect(5, 12, 2, 18);
    const box = a.layer(v % 2 ? 'cream' : 'bw_skyblue');
    box.rect(2, 6, 9, 7);
    const rf = a.layer(HX.roof);
    for (let k = 0; k < 4; k++) rf.rect(1 + k, 5 - k, 11 - 2 * k, 1, k ? BASE : LIGHT);
    a.layer('dark', { outline: false, shading: false }).rect(6, 8, 2, 2, BASE);
    a.layer('wood', { outline: false, shading: false }).set(6, 11, LIGHT).set(7, 11, BASE);
    const bird = a.layer('petal_yellow');
    bird.rect(8, 0, 3, 2);
    a.layer('dark', { outline: false, shading: false }).set(10, 0, LIGHT);
    a.layer('petal_orange', { outline: false, shading: false }).set(11, 1, BASE);
    return fin(a, 6, 29);
  },
  fence(v, p) {
    const len = p.len;
    const a = new PixelArt(len + 3, 15);
    const rails = a.layer('wood');
    rails.rect(0, 4, len + 3, 2).rect(0, 9, len + 3, 2);
    const posts = [];
    for (let x = 0; x < len - 4; x += 14) posts.push(x);
    posts.push(len);
    for (const x of posts) {
      const l = a.layer('wood');
      l.rect(x, 1, 3, 13);
      l.set(x + 1, 0, LIGHT);
    }
    // ein paar Wicken am Zaun
    const vn = a.layer('leaf', { outline: false, shading: false });
    for (let x = 5; x < len; x += 9) vn.set(x, 6 + (x % 3), BASE).set(x + 1, 7 + (x % 2), LIGHT);
    const fl = a.layer('petal_purple', { outline: false, shading: false });
    for (let x = 6; x < len; x += 18) fl.set(x, 5, LIGHT).set(x + 1, 6, BASE);
    return fin(a, 0, 14);
  },
  gate() {
    // Rosenbogen über dem Pfad, mit kleiner Laterne
    const a = new PixelArt(26, 27);
    const l = a.layer('wood');
    l.rect(1, 5, 3, 22).rect(22, 5, 3, 22);
    const top = a.layer('wood');
    top.rect(0, 3, 26, 3);
    top.rect(3, 2, 20, 1);
    const vn = a.layer('leaf');
    for (const [x, y, w, h] of [[0, 1, 5, 3], [6, 0, 4, 3], [13, 1, 5, 2], [20, 0, 6, 3], [0, 9, 2, 3], [3, 14, 2, 3], [24, 10, 2, 4], [21, 17, 2, 3], [1, 20, 2, 2]]) vn.rect(x, y, w, h);
    const ro = a.layer('petal_pink', { outline: false, shading: false });
    for (const [x, y] of [[2, 1], [8, 1], [15, 2], [22, 1], [1, 10], [4, 15], [25, 12], [22, 18]]) ro.set(x, y, LIGHT).set(x + 1, y, BASE);
    a.layer('petal_white', { outline: false, shading: false }).set(11, 0, HIGH).set(18, 1, HIGH);
    a.layer('dark', { outline: false, shading: false }).rect(13, 6, 1, 2, LIGHT);
    a.layer('dark').rect(12, 8, 3, 4);
    a.layer('lamp', { outline: false, shading: false, glow: true }).rect(12, 9, 3, 2, BASE).set(12, 9, HIGH);
    return fin(a, 13, 26);
  },
  wall(v, p) {
    // Trockenmauer: runde Feldsteine in drei versetzten Lagen, Moos und Blümchen in den Fugen
    const len = p.len;
    const a = new PixelArt(len + 3, 13);
    const rr = rng(`bw:wall:${len}:${v}`);
    const tones = ['stone', 'stone', 'stone', HX.plaster];
    for (const [y, off] of [[9, 0], [5, 3], [1, 1]]) {
      let x = off - 2;
      while (x < len) {
        const w = 5 + int(rr, 0, 3);
        const x0 = Math.max(1, x), x1 = Math.min(len + 1, x + w);
        if (x1 - x0 >= 3) {
          const st = a.layer(pick(rr, tones));
          st.ellipse((x0 + x1) / 2, y + 1.5, (x1 - x0) / 2, 2.1);
          const hl = a.layer('stone', { outline: false, shading: false });
          hl.set(Math.round(x0 + 1), y, HIGH);
        }
        x += w;
      }
    }
    const mo = a.layer('moss', { outline: false, shading: false });
    for (let x = 1; x < len; x++) if (noise(x, 1, len) > 0.5) mo.set(x, noise(x, 2, len) > 0.55 ? 0 : 1, noise(x, 3, len) > 0.5 ? LIGHT : BASE);
    for (let x = 2; x < len; x += 7) if (noise(x, 4, len) > 0.5) mo.set(x, 12, BASE).set(x + 1, 12, LIGHT);
    const fl = a.layer('petal_yellow', { outline: false, shading: false });
    for (let x = 5; x < len; x += 13) fl.set(x + int(rr, 0, 4), int(rr, 5, 9), LIGHT);
    const fp = a.layer('petal_pink', { outline: false, shading: false });
    for (let x = 9; x < len; x += 17) { const xx = x + int(rr, 0, 4); fp.set(xx, 0, LIGHT).set(xx + 1, 0, BASE); }
    return fin(a, 0, 12);
  },
  tree(v) {
    // v: 0 Apfel (mit Laterne), 1 Kirschblüte, 2 Birne
    const a = new PixelArt(62, 64);
    const tr = a.layer('wood');
    tr.rect(28, 36, 6, 25).rect(26, 58, 10, 4).rect(25, 61, 3, 1).rect(34, 61, 3, 1);
    tr.line(29, 42, 19, 33).line(30, 42, 20, 33).line(32, 40, 43, 31).line(32, 41, 44, 32);
    const bark = a.layer('wood', { outline: false, shading: false });
    for (const [x, y] of [[30, 46], [31, 50], [29, 53], [32, 56], [31, 44]]) bark.set(x, y, SHADE);
    const crown = v === 1 ? HX.blossom : 'leaf';
    const cl = a.layer(crown);
    for (const [x, y, rx, ry] of [[31, 22, 22, 15], [13, 30, 11, 8], [49, 29, 11, 9], [23, 11, 12, 9], [40, 12, 13, 9]]) cl.ellipse(x, y, rx, ry);
    const hl = a.layer(crown, { outline: false, shading: false });
    for (const [x, y, rx, ry] of [[20, 10, 6, 3], [36, 9, 7, 3], [10, 27, 4, 3], [26, 20, 7, 4], [44, 24, 5, 3]]) hl.ellipse(x, y, rx, ry, LIGHT);
    for (const [x, y] of [[19, 9], [35, 8], [24, 19], [9, 26], [43, 23]]) hl.set(x, y, HIGH);
    for (const [x, y, rx, ry] of [[38, 33, 10, 2], [18, 36, 7, 1.5], [50, 35, 6, 1.5], [30, 30, 6, 2]]) hl.ellipse(x, y, rx, ry, SHADE);
    for (let k = 0; k < 40; k++) {
      const x = 12 + Math.floor(noise(k, 1, 9 + v) * 38), y = 6 + Math.floor(noise(k, 2, 9 + v) * 28);
      if (cl.has(x, y) && cl.has(x, y + 1) && !hl.has(x, y)) hl.set(x, y, k % 3 ? SHADE : LIGHT);
    }
    if (v === 1) {
      const lv = a.layer('leaf', { outline: false, shading: false });
      for (const [x, y] of [[14, 33], [46, 33], [33, 34], [24, 31], [52, 28]]) lv.set(x, y, BASE).set(x + 1, y, SHADE);
    } else {
      const fr = a.layer(v === 2 ? 'petal_yellow' : 'cap_red');
      for (const [x, y] of [[16, 24], [27, 28], [38, 19], [47, 27], [22, 14], [33, 31], [11, 31], [44, 11]]) fr.rect(x, y, 2, 2);
    }
    if (v === 0) {
      a.layer('dark', { outline: false, shading: false }).rect(55, 36, 1, 3, LIGHT);
      a.layer('dark').rect(54, 39, 3, 4);
      a.layer('lamp', { outline: false, shading: false, glow: true }).rect(54, 40, 3, 2, BASE).set(54, 40, HIGH);
    }
    return fin(a, 31, 63);
  },
  treeS(v) {
    // kleiner Baum: 1 Kirschblüte, 3 junger Apfel
    const a = new PixelArt(46, 50);
    a.layer('wood').rect(20, 28, 6, 20).rect(18, 46, 10, 3).line(23, 34, 15, 26).line(23, 33, 31, 25);
    const crown = v === 1 ? HX.blossom : 'leaf';
    const cl = a.layer(crown);
    for (const [x, y, rx, ry] of [[23, 19, 15, 10], [10, 24, 8, 6], [36, 23, 8, 6], [16, 10, 9, 6], [30, 9, 9, 7], [23, 27, 9, 4]]) cl.ellipse(x, y, rx, ry);
    for (let k = 0; k < 24; k++) { const x = 6 + Math.floor(noise(k, 1, 31 + v) * 34), y = 4 + Math.floor(noise(k, 2, 31 + v) * 24); if (cl.has(x, y) && cl.has(x, y + 1)) a.layer(crown, { outline: false, shading: false }).set(x, y, k % 3 ? SHADE : LIGHT); }
    const hl = a.layer(crown, { outline: false, shading: false });
    for (const [x, y, rx, ry] of [[17, 8, 5, 2], [14, 17, 5, 3], [30, 15, 4, 2]]) hl.ellipse(x, y, rx, ry, LIGHT);
    for (const [x, y, rx, ry] of [[28, 28, 7, 1.5], [12, 29, 4, 1]]) hl.ellipse(x, y, rx, ry, SHADE);
    hl.set(16, 7, HIGH).set(13, 16, HIGH);
    if (v !== 1) {
      const fr = a.layer('cap_red');
      for (const [x, y] of [[15, 20], [27, 14], [33, 24], [20, 26]]) fr.rect(x, y, 2, 2);
    } else {
      const lv = a.layer('leaf', { outline: false, shading: false });
      for (const [x, y] of [[8, 27], [14, 28], [29, 29], [37, 26], [24, 30], [5, 23], [41, 21], [33, 14], [11, 15]]) lv.set(x, y, BASE).set(x + 1, y, SHADE).set(x, y - 1, LIGHT);
      const fl = a.layer('petal_white', { outline: false, shading: false });
      for (const [x, y] of [[12, 22], [25, 12], [33, 20], [19, 27], [28, 6]]) fl.set(x, y, HIGH);
    }
    return fin(a, 23, 49);
  },
  swing(v, p) {
    const len = p.len;
    const a = new PixelArt(15, len + 4);
    const r = a.layer(HX.straw, { outline: false, shading: false });
    for (let y = 0; y < len; y++) { r.set(2, y, y % 2 ? BASE : LIGHT); r.set(12, y, y % 2 ? SHADE : BASE); }
    const s = a.layer('wood');
    s.rect(1, len, 13, 2);
    return fin(a, 7, len + 2);
  },
  bench() {
    const a = new PixelArt(28, 15);
    const legs = a.layer('wood', { outline: false, shading: false });
    for (const x of [4, 5, 22, 23]) for (let y = 10; y <= 14; y++) legs.set(x, y, x % 2 ? OUTLINE : SHADE);
    a.layer('wood').rect(3, 1, 22, 2).rect(3, 4, 22, 2);
    a.layer('wood').rect(5, 1, 2, 8).rect(21, 1, 2, 8);
    const seat = a.layer('wood');
    seat.rect(1, 8, 26, 2);
    for (let x = 1; x < 27; x++) seat.set(x, 8, HIGH);
    // Kissen
    a.layer('petal_blue').rect(8, 6, 5, 2);
    return fin(a, 14, 14);
  },
  sign() {
    const a = new PixelArt(20, 26);
    a.layer('wood').rect(9, 3, 3, 23);
    const r1 = a.layer('wood');
    r1.rect(11, 5, 6, 4).rect(17, 6, 1, 2);
    const r2 = a.layer('wood');
    r2.rect(3, 11, 6, 4).rect(2, 12, 1, 2);
    const t = a.layer('cream', { outline: false, shading: false });
    for (let x = 12; x <= 15; x++) if (x !== 14) t.set(x, 7, LIGHT);
    for (let x = 4; x <= 7; x++) if (x !== 5) t.set(x, 13, LIGHT);
    a.layer(HX.roof, { shading: false }).rect(8, 1, 5, 2, BASE);
    a.layer('leaf', { outline: false, shading: false }).set(10, 22, BASE).set(11, 23, LIGHT).set(9, 24, LIGHT);
    return fin(a, 10, 25);
  },
  lamppost() {
    const a = new PixelArt(13, 28);
    a.layer('wood').rect(2, 3, 3, 25);
    a.layer('wood').rect(2, 3, 9, 2);
    a.layer('dark', { outline: false, shading: false }).rect(8, 5, 1, 2, LIGHT);
    a.layer('dark').rect(7, 7, 3, 5);
    a.layer('dark', { outline: false, shading: false }).rect(6, 7, 5, 1, HIGH);
    a.layer('lamp', { outline: false, shading: false, glow: true }).rect(7, 8, 3, 3, BASE).set(7, 8, HIGH);
    a.layer('leaf', { outline: false, shading: false }).set(1, 26, BASE).set(5, 25, LIGHT).set(5, 26, BASE);
    return fin(a, 3, 27);
  },
  basket() {
    const a = new PixelArt(14, 12);
    const h = a.layer(HX.wicker, { outline: false, shading: false });
    for (let x = 3; x <= 10; x++) h.set(x, Math.round(4 - Math.sin(((x - 3) / 7) * Math.PI) * 3), SHADE);
    const bk = a.layer(HX.wicker);
    bk.rect(2, 5, 10, 6);
    const wv = a.layer(HX.wicker, { outline: false, shading: false });
    for (let y = 6; y <= 10; y++) for (let x = 3; x <= 10; x++) if ((x + y) % 3 === 0) wv.set(x, y, SHADE);
    const cl = a.layer('petal_red', { shading: false });
    cl.rect(3, 4, 4, 2, LIGHT);
    a.layer('cream', { outline: false, shading: false }).set(4, 4, HIGH).set(6, 5, HIGH);
    a.layer('wood', { outline: false, shading: false }).set(9, 4, HIGH);
    return fin(a, 7, 11);
  },
  plate() {
    const a = new PixelArt(9, 4);
    a.layer('petal_white', { shading: false }).ellipse(4.5, 2, 3.6, 1.6, LIGHT);
    a.layer('cap_red', { outline: false, shading: false }).set(3, 1, LIGHT).set(5, 2, BASE).set(4, 2, LIGHT).set(6, 1, BASE);
    return fin(a, 4, 3);
  },
  reeds(v) {
    const a = new PixelArt(13, 19);
    const lv = a.layer('leaf_sage', { outline: false, shading: false });
    lv.line(6, 18, 2, 8, BASE).line(6, 18, 10, 9, LIGHT).line(5, 18, 1, 13, SHADE).line(7, 18, 12, 12, BASE);
    const st = a.layer('stem', { outline: false, shading: false });
    st.line(4, 18, 4, 3, SHADE).line(7, 18, 8, 1, BASE);
    if (v !== 1) st.line(9, 18, 10, 6, SHADE);
    const hd = a.layer(HX.darkwood);
    hd.rect(4, 4, 1, 4).rect(8, 2, 1, 4);
    if (v !== 1) hd.rect(10, 7, 1, 3);
    return fin(a, 6, 18);
  },
  duck(v) {
    const a = new PixelArt(9, 7);
    const ramp = v === 1 ? 'wood' : 'petal_white';
    a.layer(ramp).ellipse(3.5, 4.5, 3.4, 1.8);
    const hd = a.layer(v === 2 ? 'leaf_deep' : ramp);
    hd.rect(6, 1, 2, 2);
    a.layer('petal_orange', { outline: false, shading: false }).set(8, 2, BASE);
    a.layer('dark', { outline: false, shading: false }).set(7, 1, LIGHT);
    a.layer(HX.water, { outline: false, shading: false }).rect(0, 6, 8, 1, LIGHT);
    return fin(a, 4, 6);
  },
  scarecrow() {
    const a = new PixelArt(22, 34);
    a.layer('wood').rect(10, 12, 2, 22);
    a.layer('wood').rect(2, 13, 18, 2);
    const sh = a.layer('petal_blue');
    sh.rect(7, 12, 8, 10);
    a.layer('petal_red', { shading: false }).rect(8, 17, 2, 2, BASE);
    const hands = a.layer(HX.straw, { outline: false, shading: false });
    hands.line(2, 15, 0, 17, LIGHT).line(3, 15, 2, 17, BASE).line(19, 15, 21, 17, LIGHT).line(18, 15, 19, 17, BASE);
    hands.line(9, 22, 8, 25, BASE).line(12, 22, 13, 25, LIGHT);
    const hd = a.layer('cream');
    hd.ellipse(11, 8, 3, 3);
    a.layer('dark', { outline: false, shading: false }).set(10, 8, LIGHT).set(12, 8, LIGHT);
    const hat = a.layer(HX.straw);
    hat.rect(5, 5, 12, 1).rect(8, 1, 6, 4);
    a.layer('petal_red', { outline: false, shading: false }).rect(8, 4, 6, 1, BASE);
    const crow = a.layer('dark');
    crow.rect(17, 10, 3, 2);
    a.layer('dark', { outline: false, shading: false }).set(20, 10, HIGH);
    a.layer('gh_corn_kernel', { outline: false, shading: false }).set(21, 11, BASE);
    return fin(a, 11, 33);
  },
  barrel() {
    const a = new PixelArt(12, 14);
    const b = a.layer('wood');
    b.rect(2, 3, 8, 10);
    const bands = a.layer('dark', { outline: false, shading: false });
    for (let x = 2; x <= 9; x++) { bands.set(x, 5, HIGH); bands.set(x, 10, HIGH); }
    const st = a.layer('wood', { outline: false, shading: false });
    for (let y = 3; y <= 12; y++) if (y !== 5 && y !== 10) st.set(5, y, SHADE).set(3, y, LIGHT);
    a.layer(HX.water, { shading: false }).rect(3, 2, 6, 1, LIGHT);
    a.layer('leaf', { outline: false, shading: false }).set(1, 12, BASE).set(10, 11, LIGHT).set(11, 12, BASE);
    return fin(a, 6, 13);
  },
  rabbit(v) {
    const a = new PixelArt(10, 9);
    const ramp = v === 1 ? 'cream' : v === 2 ? 'petal_white' : 'gh_butternut';
    a.layer(ramp).ellipse(5.5, 6, 3.4, 2.4);
    const hd = a.layer(ramp);
    hd.ellipse(2.6, 4, 1.9, 1.7);
    hd.rect(2, 0, 1, 3).rect(3, 1, 1, 2);
    a.layer('petal_white', { outline: false, shading: false }).set(9, 5, HIGH);
    a.layer('dark', { outline: false, shading: false }).set(2, 4, LIGHT);
    a.layer('petal_pink', { outline: false, shading: false }).set(1, 5, BASE);
    return fin(a, 5, 8);
  },
  hedgehog() {
    const a = new PixelArt(10, 7);
    const b = a.layer(HX.darkwood);
    b.ellipse(5.5, 4, 3.6, 2.4);
    const sp = a.layer(HX.darkwood, { outline: false, shading: false });
    for (const [x, y] of [[4, 2], [6, 2], [7, 3], [5, 3], [8, 4]]) sp.set(x, y, HIGH);
    a.layer('cream').rect(1, 4, 2, 2);
    a.layer('dark', { outline: false, shading: false }).set(0, 5, LIGHT);
    return fin(a, 5, 6);
  },
  sprout(v) {
    const a = new PixelArt(8, 6);
    const s = a.layer('leaf', { outline: false, shading: false });
    s.set(4, 5, SHADE).set(4, 4, BASE).set(3, 3, LIGHT).set(2, 2, HIGH).set(5, 3, BASE).set(6, 2, LIGHT);
    if (v === 1) s.set(4, 3, BASE).set(4, 2, LIGHT).set(3, 1, HIGH);
    a.layer('soil', { outline: false, shading: false }).set(3, 5, LIGHT).set(5, 5, BASE);
    return fin(a, 4, 5);
  },
  shroom(v) {
    const a = new PixelArt(7, 7);
    a.layer('cream').rect(3, 4, 1, 2);
    const cap = a.layer(v === 1 ? 'gh_butternut' : 'cap_red');
    cap.ellipse(3.5, 3, 2.6, 1.6);
    a.layer('petal_white', { outline: false, shading: false }).set(2, 2, HIGH).set(4, 3, HIGH);
    return fin(a, 3, 6);
  },
  blades(v) {
    // hohe Halme für den Vordergrund
    const a = new PixelArt(18, 22);
    const ramp = ['leaf', 'leaf_deep', 'leaf_sage', 'moss'][v % 4];
    const g = a.layer(ramp, { outline: false, shading: false });
    const tips = [[2, 4], [5, 0], [8, 3], [11, 1], [14, 5], [16, 9], [1, 10], [9, 8], [12, 7]];
    tips.forEach(([tx, ty], k) => {
      const bx = 6 + (k % 6);
      g.line(bx, 21, (bx + tx) / 2 + (tx < bx ? -1 : 1), (21 + ty) / 2, k % 3 === 0 ? SHADE : BASE);
      g.line((bx + tx) / 2 + (tx < bx ? -1 : 1), (21 + ty) / 2, tx, ty, k % 2 ? LIGHT : BASE);
      g.set(tx, ty, HIGH);
    });
    for (let x = 5; x <= 12; x++) g.set(x, 21, OUTLINE);
    if (v % 2 === 0) {
      const sd = a.layer(HX.straw, { outline: false, shading: false });
      sd.set(5, 0, LIGHT).set(5, 1, BASE).set(11, 1, HIGH).set(11, 2, BASE).set(4, 1, BASE);
    }
    return fin(a, 9, 21);
  },
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

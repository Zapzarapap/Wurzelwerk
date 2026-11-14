// Gewächshaus – Szene (API und Stilregeln: docs/SZENEN.md).
//
// Ein viktorianisches Glashaus, von innen in 3/4-Ansicht: hinten eine hohe
// Glaswand mit Rundbogen-Sprossen über einem Ziegelsockel, darüber je Joch ein
// Glasgiebel (Rundbogen, Spitzgiebel oder Laternenaufsatz). Jeder Abschnitt ist
// ein Joch (Zelle 144×112) mit eigener Pflanz-Ecke:
//   hochbeet    – zwei Hochbeete verschiedener Form (Holz, Weidengeflecht, Ziegel, Trockenmauer)
//   pflanztisch – Pflanztisch mit Werkzeug und Saatgut-Tütchen, Holzkisten, Pflanzsäcke
//   spirale     – Kräuterspirale aus Steinen, Tontöpfe drumherum
//   kuebel      – halbes Weinfass, Zinkwanne, Rankpyramide, Kübel
//   rundbeet    – ovales Beet mit Ziegelkante und Vogeltränke
// Joche der ersten Reihe haben zusätzlich die Glaswand mit Stellage, Rankkasten
// oder Fensterbank und Hängekörben. Das Haus wächst in Reihen (Richtung
// Betrachter) und Spalten (Anbauten mit eigenem Giebel, eigenem Boden und eigener
// Rahmenfarbe). Draußen: Rasen, Außenbeete, Regentonne, Trittsteine.
// Große Möbel und Gefäße sind Hintergrund (liegen immer hinter den Pflanzen);
// Teile sind nur Deko (weicht Pflanzen) – so verdeckt nie etwas eine Pflanze.
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, C, Buf, rgbRamp, mix, trap, text, textWidth, fin, sprite } from '../scenekit/draw.js';
import { gridSequence } from '../scenekit/engine.js';
import { rng, noise, hashString, pick } from '../scenekit/rng.js';
import { prop, propBox } from '../scenekit/props.js';

// --- Maße ------------------------------------------------------------------------
const CW = 144, CH = 112; // Joch (Boden)
const WALL = 68; // Höhe der Glaswand-Zone in Reihe 0 (über dem Boden)
const KNEE = 50; // Oberkante Ziegelsockel (lokal in der Wandzone)
const ROOF = 36;
const PAD = { top: ROOF, left: 14, right: 14, bottom: 40 };
const GRID = { cw: CW, ch: CH, aspect: 1.5, start: [1, 1] };

// --- eigene Rampen [outline, shade, base, light, highlight] ------------------------
const HX = {
  frameW: ['#5c5850', '#a49f90', '#d2cdbc', '#ebe7d8', '#faf8ee'],
  frameG: ['#22322a', '#3c5a48', '#58806a', '#7ea48a', '#a8c8ac'],
  frameB: ['#2a2420', '#4a3e34', '#6a5a4a', '#8a7862', '#a8987e'],
  brick: ['#4a2a22', '#7e4636', '#a45c44', '#c27a5a', '#dca084'],
  gravel: ['#6a5e4c', '#968a72', '#b6a98c', '#cdc1a4', '#e2d8c0'],
  tile: ['#5a3020', '#9a5638', '#bc7450', '#d49470', '#e8b892'],
  wicker: ['#5a3c1c', '#9a6a34', '#c8944c', '#e0b46c', '#f2d494'],
  zinc: ['#3a4448', '#66747a', '#8e9ca0', '#b4c0c2', '#dae2e2'],
  oak: ['#2e1c12', '#553420', '#7a4c2e', '#9a6a42', '#b88a5c'],
  felt: ['#1c2620', '#30443a', '#465e50', '#607a68', '#84a08a'],
  burlap: ['#4a3820', '#7a6038', '#a08250', '#bea070', '#d8c094'],
  glazeS: ['#2e3e38', '#587a6c', '#7ea292', '#a2c2b2', '#cae0d4'],
  glazeC: ['#6a5a48', '#b8a68a', '#e0d2b8', '#f0e8d6', '#fcf8ee'],
  glazeB: ['#24324a', '#41587a', '#5e7aa0', '#86a2c4', '#b6cce2'],
  lawn: ['#1e3a24', '#2f5a32', '#457c3e', '#5e9a4a', '#82b85e'],
  hedge: ['#16301e', '#22482a', '#336236', '#4a7e42', '#6c9c54'],
  chalk: ['#1a1e1c', '#262c28', '#323a34', '#46504a', '#e8e4d8'],
  robin: ['#3a2418', '#7a4a2a', '#a06838', '#c08a52', '#d8aa70'],
};
const R = Object.fromEntries(Object.entries(HX).map(([k, v]) => [k, rgbRamp(v)]));
const FRAMES = ['frameW', 'frameG', 'frameW', 'frameB'];
const POTS = ['terracotta', HX.glazeS, 'terracotta', HX.glazeC, 'terracotta', HX.glazeB];

// --- Pflanz-Ecken: Stellplätze (lokal im Boden, y = Bodenzeile) ------------------
// pot: Gefäß, das unter den Spot gemalt wird (null = im Beet/auf Mauerwerk).
const sp = (x, y, kind, pot = null, extra = {}) => ({ x, y, kind, pot, ...extra });
const TYPES = {
  hochbeet: {
    spots: [
      sp(22, 34, 'bed'), sp(46, 28, 'bed'), sp(70, 36, 'bed'),
      sp(108, 58, 'bed'), sp(127, 64, 'bed'),
      sp(20, 72, 'floor', 'pot'), sp(50, 86, 'floor', 'sack'), sp(84, 74, 'floor', 'pot'), sp(124, 92, 'floor', 'pot'),
    ],
    deco: [[100, 104], [28, 104], [70, 102]],
    clutter: [[8, 60], [92, 24], [138, 34]],
  },
  pflanztisch: {
    spots: [
      sp(22, 27, 'table', 'pot'), sp(56, 27, 'table', 'pot'),
      sp(100, 40, 'crate', 'crate'), sp(126, 52, 'crate', 'crate'),
      sp(24, 74, 'floor', 'sack'), sp(58, 68, 'floor', 'pot'), sp(92, 84, 'floor', 'pot'), sp(122, 80, 'floor', 'sack'),
    ],
    deco: [[40, 102], [110, 104], [74, 106]],
    clutter: [[84, 22], [138, 30], [44, 56]],
  },
  spirale: {
    spots: [
      sp(70, 44, 'spiral'), sp(46, 60, 'spiral'), sp(94, 58, 'spiral'), sp(66, 82, 'spiral'),
      sp(16, 36, 'floor', 'pot'), sp(128, 34, 'floor', 'pot'), sp(20, 88, 'floor', 'pot'), sp(124, 88, 'floor', 'sack'),
    ],
    deco: [[96, 104], [44, 104]],
    clutter: [[106, 28], [36, 26], [100, 80]],
  },
  kuebel: {
    spots: [
      sp(28, 42, 'tub', 'barrel'), sp(88, 34, 'tub'), sp(114, 32, 'tub'),
      sp(42, 82, 'floor', 'big'), sp(72, 66, 'floor', 'pot'), sp(102, 86, 'floor', 'sack'), sp(130, 64, 'floor', 'pot'), sp(14, 90, 'floor', 'pot'),
    ],
    deco: [[70, 104], [124, 106], [20, 62]],
    clutter: [[56, 32], [10, 26], [128, 44]],
  },
  rundbeet: {
    spots: [
      sp(30, 54, 'bed'), sp(54, 44, 'bed'), sp(78, 50, 'bed'), sp(100, 60, 'bed'), sp(42, 76, 'bed'), sp(70, 74, 'bed'),
      sp(130, 36, 'floor', 'pot'), sp(128, 92, 'floor', 'pot'),
    ],
    deco: [[24, 102], [96, 104]],
    clutter: [[14, 28], [112, 24], [104, 86]],
  },
};
const ORDER = ['pflanztisch', 'rundbeet', 'spirale', 'kuebel', 'hochbeet'];

// Glaswand-Zone (nur Reihe 0), lokal 0..WALL
const WALLS = {
  stellage: [
    sp(18, 41, 'sill', 'pot'), sp(54, 41, 'sill', 'pot'),
    sp(36, 57, 'stage', 'pot'), sp(72, 57, 'stage', 'pot'),
    sp(112, 22, 'hang', 'basket', { w: 0.6 }), sp(124, 63, 'floor', 'big'),
  ],
  ranke: [
    sp(22, 60, 'trough'), sp(50, 60, 'trough'), sp(80, 60, 'trough'),
    sp(124, 41, 'sill', 'pot'), sp(122, 18, 'hang', 'basket', { w: 0.6 }),
  ],
  bank: [
    sp(20, 41, 'sill', 'pot'), sp(56, 41, 'sill', 'pot'), sp(92, 41, 'sill', 'pot'), sp(128, 41, 'sill', 'pot'),
    sp(38, 18, 'hang', 'basket', { w: 0.6 }), sp(110, 18, 'hang', 'basket', { w: 0.6 }),
  ],
};
const WALL_ORDER = ['ranke', 'bank', 'stellage'];

let seq = [];
const cellOf = (i) => {
  if (i >= seq.length) seq = gridSequence(Math.max(i + 1, seq.length * 2, 16), GRID);
  return seq[i];
};

/** Joch i: Lage, Typ, Spiegelung, Wand – nur von i abhängig. */
export function cellInfo(i) {
  const [c, r] = cellOf(i);
  const rr = rng(`gh:cell:${i}`);
  let type;
  if (i === 0) type = 'hochbeet';
  else {
    const block = Math.floor((i - 1) / ORDER.length), br = rng(`gh:block:${block}`);
    const perm = ORDER.map((t) => [br(), t]).sort((a, z) => a[0] - z[0]).map((x) => x[1]);
    type = block === 0 ? ORDER[i - 1] : perm[(i - 1) % ORDER.length];
  }
  const mirror = i === 0 ? false : rr() < 0.5;
  const wall = r === 0 ? (c === 0 ? 'stellage' : WALL_ORDER[(c - 1 + (hashString(`gh:w:${c}`) % 2)) % 3]) : null;
  const wmirror = r === 0 && c > 0 ? rng(`gh:wm:${c}`)() < 0.5 : false;
  return { c, r, type, mirror, wall, wmirror };
}

const top0 = (r) => (r === 0 ? -WALL : r * CH); // Oberkante des Rechtecks
const floorOff = (r) => (r === 0 ? WALL : 0); // Bodenzeile 0 im Rechteck

export default {
  id: 'gewaechshaus',
  nofoot: true,
  anchor: 'top',
  pad: PAD,
  minSections: 1,
  maxFill: 30,

  section(i) {
    const info = cellInfo(i);
    const { c, r } = info;
    const mx = (x) => (info.mirror ? CW - x : x);
    const wx = (x) => (info.wmirror ? CW - x : x);
    const off = floorOff(r);
    const spots = [];
    let n = 0;
    const add = (s, x, y, zone) => {
      const v = hashString(`gh:pv:${i}:${n++}`) % 97;
      const o = { x, y, kind: s.kind, ground: 'soil', zone, pv: v };
      if (s.pot) o.pot = s.pot;
      if (s.w) o.w = s.w;
      spots.push(o);
    };
    if (r === 0) for (const s of WALLS[info.wall]) add(s, wx(s.x), s.y, 'wall');
    for (const s of TYPES[info.type].spots) add(s, mx(s.x), s.y + off, 'floor');
    return { rect: { x: c * CW, y: top0(r), w: CW, h: CH + off }, ...info, spots };
  },

  pieces(scene) {
    const out = [];
    const free = new Set(scene.free.map((f) => f.key));
    let cat = false;
    const cells = cellMap(scene);
    for (const s of scene.sections) {
      // Deko auf freien Spots: Schildchen, Keimlinge, Schäufelchen …
      for (const p of s.spots) {
        if (!free.has(p.key)) continue;
        const r2 = rng(`gh:free:${p.key}`);
        const u = r2();
        let kind = null, v = Math.floor(r2() * 3);
        if (p.kind === 'hang') kind = u < 0.7 ? 'trail' : null;
        else if (u < 0.36) kind = 'stake';
        else if (u < 0.66) kind = 'sprout';
        else if (u < 0.74) kind = 'trowel';
        else if (u < 0.8 && p.kind !== 'sill' && p.kind !== 'stage' && p.kind !== 'table') kind = 'packet';
        if (!kind) continue;
        const dx = kind === 'trail' ? 0 : Math.round((r2() - 0.5) * 4);
        out.push({ kind, v, x: p.x + dx, y: p.y, z: p.z, spot: p.key });
      }
      // freie Deko auf den Wegen (weicht Pflanzen)
      const T = TYPES[s.type];
      const rr = rng(`gh:deco:${s.index}`);
      const ox = s.rect.x, oy = s.rect.y + floorOff(s.r);
      for (const [lx, ly] of T.deco) {
        if (rr() > 0.62) continue;
        const x = ox + (s.mirror ? CW - lx : lx), y = oy + ly;
        let name = pick(rr, DECO);
        if (name === 'catsit') { if (cat) name = 'can'; else cat = true; }
        const v = Math.floor(rr() * 3), flip = rr() < 0.5;
        const isProp = !BUILD[name];
        const box = isProp ? propBox(name, x, y) : boxOf(name, x, y);
        const piece = isProp ? { prop: name, v } : { kind: name, v };
        out.push({ ...piece, x, y, z: y, flip, yield: true, box });
      }
      // Rotkehlchen auf dem Rand von Wanne/Vogeltränke/Stellage (selten)
      const rb = rng(`gh:bird:${s.index}`);
      if (rb() < 0.3) {
        const perch = PERCH[s.type];
        if (perch) {
          const x = ox + (s.mirror ? CW - perch[0] : perch[0]), y = oy + perch[1];
          out.push({ kind: 'bird', v: rb() < 0.5 ? 0 : 1, x, y, z: y + 0.5, flip: (rb() < 0.5) !== s.mirror, yield: true, box: { x0: x - 3, x1: x + 3, y0: y - 6, y1: y } });
        }
      }
    }
    void cells;
    return out;
  },

  sprite(p) {
    const b = BUILD[p.kind];
    return b ? sprite(`gh|${p.kind}|${p.v || 0}`, () => b(p.v || 0)) : null;
  },

  paint(scene) {
    return paintAll(scene);
  },
};

// Sitzplätze für das Rotkehlchen (lokal Boden)
const PERCH = { rundbeet: [120, 49], kuebel: [18, 32], spirale: [70, 34], pflanztisch: [12, 33], hochbeet: [92, 48] };
const CLUTTER = ['potstack', 'sack', 'soilbox', 'crate', 'broom', 'can', 'potstack', 'seedtray'];
const DECO = ['can', 'boots', 'barrow', 'harvest', 'flantern', 'hose', 'can', 'catsit', 'seedtray', 'boots', 'flantern'];
const SIZE = { boots: [12, 11], barrow: [24, 14], harvest: [16, 10], flantern: [8, 12], hose: [14, 12], seedtray: [20, 9], bird: [7, 6] };
const boxOf = (name, x, y) => {
  const [w, h] = SIZE[name] || [12, 12];
  return { x0: x - w / 2 - 1, x1: x + w / 2 + 1, y0: y - h - 1, y1: y + 1 };
};

// --- Hilfen ------------------------------------------------------------------

function cellMap(scene) {
  const m = new Map();
  for (const s of scene.sections) m.set(`${s.c},${s.r}`, s);
  return m;
}

/** Bodenrechteck eines Jochs (Welt). */
const floorRect = (s) => ({ x: s.rect.x, y: s.rect.y + floorOff(s.r), w: CW, h: CH });

// --- Hintergrund ------------------------------------------------------------------

function paintAll(scene) {
  const { W, H } = scene;
  const b = new Buf(W, H);
  const halos = [], beams = [], critters = [], fireflies = [];
  const cells = cellMap(scene);
  const ox = scene.ox, oy = scene.oy;
  const r0 = scene.sections.filter((s) => s.r === 0);
  const horizon = r0[0].rect.y + WALL; // Bodenlinie hinten = Horizont draußen
  const wallTop = r0[0].rect.y;
  const hallX0 = Math.min(...scene.sections.map((s) => s.rect.x));
  const hallX1 = Math.max(...scene.sections.map((s) => s.rect.x + CW));
  // Unterkante je Spalte
  const colBottom = new Map();
  for (const s of scene.sections) colBottom.set(s.c, Math.max(colBottom.get(s.c) ?? -Infinity, s.rect.y + s.rect.h));
  const inHall = (x, y, m = 0) => {
    if (x < hallX0 - m || x >= hallX1 + m || y < wallTop - ROOF) return false;
    const c = Math.floor((x - hallX0) / CW);
    const cc = Math.max(0, Math.min(c, Math.floor((hallX1 - hallX0) / CW) - 1));
    for (const k of [cc - 1, cc, cc + 1]) {
      const bot = colBottom.get(k);
      if (bot == null) continue;
      const x0 = hallX0 + k * CW;
      if (x >= x0 - m && x < x0 + CW + m && y < bot + m) return true;
    }
    return false;
  };

  // 1) draußen: Himmel (durchsichtig), Hecke am Horizont, Rasen
  paintOutside(b, scene, horizon, inHall, halos, fireflies);

  // 2) Böden aller Joche
  scene._clutter = [];
  for (const s of scene.sections) paintFloor(b, s, scene);
  const clutter = scene._clutter;
  delete scene._clutter;

  // 3) Glaswand, Giebel
  for (const s of r0) paintWall(b, s, scene, halos, beams);

  // 4) Ränder: Seitenwände, Vorderkante mit Tür
  paintEdges(b, scene, cells, colBottom, halos);

  // 5) Pflanz-Ecken (Beete, Tische, Gefäße) – in Zeilen-Reihenfolge
  const arts = [];
  for (const s of [...scene.sections].sort((a, z) => a.r - z.r || a.c - z.c)) {
    paintCorner(b, s, arts, scene);
    if (s.r === 0) paintWallCorner(b, s, arts, halos, scene);
    // Gefäße unter den Spots
    for (const p of s.spots) {
      const q = POTART[p.pot];
      if (q) arts.push([q(p.pv), p.x, p.y, p.y]);
    }
  }
  for (const [name, x, y, v] of clutter) {
    const art = BUILD[name] ? sprite(`gh|${name}|${v}`, () => BUILD[name](v)) : prop(name, name === 'crate' ? 2 : v);
    arts.push([art, x, y, y - 0.5]);
    if (name === 'flantern') halos.push({ x, y: y - 6, r: 24, rgb: [255, 196, 110], a: 0.38 });
  }
  for (const s of scene.sections) { const f = floorRect(s); halos.push({ x: f.x + CW / 2, y: f.y + CH / 2, r: 80, rgb: [255, 170, 90], a: 0.08 }); }
  arts.sort((a, z) => a[3] - z[3]);
  for (const [art, x, y] of arts) b.art(art, x, y);

  // 6) Licht: Sonnenstrahlen + Staub, Lichterketten, Laternen
  for (const s of r0) {
    const x = s.rect.x, yt = s.rect.y + 2, bot = colBottom.get(s.c);
    const len = Math.min(bot - yt, 260);
    beams.push({ pts: [[x + 14, yt], [x + 70, yt], [x + 70 + len * 0.42, yt + len], [x + 14 + len * 0.42, yt + len]], rgb: [255, 238, 196], a: 0.11, when: 'day' });
    const rd = rng(`gh:dust:${s.c}`);
    for (let k = 0; k < 18; k++) {
      const t = rd(), u = rd();
      const yy = yt + 30 + t * (len - 40), xx = x + 18 + u * 48 + (yy - yt) * 0.42;
      b.set(xx, yy, [255, 246, 214], 110);
    }
  }
  for (const s of scene.sections) {
    if (scene.sections.length > 1 && s.r > 0 && s.r % 2 === 0) continue;
    const rc = rng(`gh:crit:${s.index}`);
    if (rc() < 0.5 && critters.length < 6) {
      const f = floorRect(s);
      const wcol = pick(rc, [[[250, 250, 244], [230, 226, 210]], [[250, 214, 90], [236, 180, 60]], [[170, 200, 250], [120, 160, 230]]]);
      critters.push({ x: f.x + 24 + Math.floor(rc() * (CW - 48)), y: f.y + 10 + Math.floor(rc() * 50), p: rc() * 6.28, bee: rc() < 0.45, rgb: wcol[0], rgb2: wcol[1] });
    }
  }

  const { canvas, glow } = b.finish();
  const indoor = scene.sections.map((s) => ({ x: s.rect.x, y: s.rect.y, w: CW, h: s.rect.h }));
  return { canvas, glow, halos, beams, indoor, indoorWarm: [216, 176, 136], sky: true, skySeed: 5, outside: [52, 76, 44], fx: { fireflies, critters } };
}

// --- draußen ------------------------------------------------------------------------

function paintOutside(b, scene, horizon, inHall, halos, fireflies) {
  const { W, H, ox, oy } = scene;
  const L = R.lawn, HG = R.hedge;
  // Hecke und Büsche hinter dem Glashaus (nur sichtbar neben dem Haus und durchs Glas)
  const hedgeTop = (x) => horizon - 14 + Math.round(Math.sin((x - ox) / 9) * 2 + Math.sin((x - ox) / 23 + 1) * 3);
  for (let x = 0; x < W; x++) {
    const t = hedgeTop(x);
    for (let y = Math.max(0, t); y < horizon; y++) {
      const n = noise((x - ox) >> 1, (y - oy) >> 1, 71);
      b.set(x, y, y === t ? HG[3] : n > 0.78 ? HG[3] : n < 0.18 ? HG[1] : HG[2]);
    }
    // ferne Baumkronen
    const tt = horizon - 26 + Math.round(Math.sin((x - ox) / 17 + 2) * 6 + Math.sin((x - ox) / 7) * 2);
    for (let y = Math.max(0, tt); y < t; y++) b.set(x, y, noise((x - ox) >> 1, (y - oy) >> 1, 73) > 0.7 ? mix(HG[2], [120, 150, 170], 0.35) : mix(HG[1], [120, 150, 170], 0.35));
  }
  // Rasen
  for (let y = horizon; y < H; y++)
    for (let x = 0; x < W; x++) {
      const cx = x - ox, cy = y - oy;
      const n = noise(cx, cy, 77), n2 = noise(cx >> 3, cy >> 2, 79);
      let col = n2 > 0.6 ? mix(L[2], L[3], 0.6) : L[2];
      if (n > 0.93) col = mix(L[3], L[4], 0.5);
      else if (n < 0.07) col = mix(L[1], L[2], 0.5);
      if (y === horizon) col = L[1];
      b.set(x, y, col);
    }
  // Blümchen und Klee im Rasen
  for (let y = horizon + 2; y < H; y += 3)
    for (let x = 0; x < W; x += 3) {
      const n = noise((x - ox) / 3 | 0, (y - oy) / 3 | 0, 83);
      if (n > 0.965 && !inHall(x, y, 4)) {
        const col = n > 0.985 ? C.petal_white[3] : n > 0.975 ? C.petal_yellow[3] : C.petal_pink[3];
        b.set(x, y, col); b.set(x + 1, y + 1, L[1]);
      }
    }
  // Außenbeete und Kleinkram in freien Rasenflächen (Kacheln in Inhaltskoordinaten)
  const TW = 52, TH = 44;
  for (let ty = Math.floor((horizon - oy) / TH); ty * TH + oy < H; ty++)
    for (let tx = Math.floor(-ox / TW) - 1; tx * TW + ox < W; tx++) {
      const x0 = tx * TW + ox, y0 = ty * TH + oy;
      const rr = rng(`gh:out:${tx}:${ty}`);
      const k = rr();
      const x = x0 + 8 + Math.floor(rr() * (TW - 16)), y = y0 + 14 + Math.floor(rr() * (TH - 18));
      let art = null, w = 0, h = 0, ay = 0;
      if (k < 0.3) { art = outBed(Math.floor(rr() * 3)); w = 30; h = 16; ay = 15; }
      else if (k < 0.45) { art = bushArt(Math.floor(rr() * 2)); w = 24; h = 16; ay = 15; }
      else if (k < 0.62) { art = flowerClump(Math.floor(rr() * 3)); w = 14; h = 10; ay = 9; }
      else if (k < 0.72) { art = stones(); w = 18; h = 8; ay = 7; }
      if (!art) continue;
      if (y - ay < horizon + 4 || x - w / 2 < 2 || x + w / 2 > W - 2 || y > H - 2) continue;
      if (inHall(x - w / 2, y - ay, 6) || inHall(x + w / 2, y - ay, 6) || inHall(x - w / 2, y, 6) || inHall(x + w / 2, y, 6)) continue;
      b.art(art, x, y);
      if (rr() < 0.3) fireflies.push({ x, y: y - ay - 4, p: rr() * 6.28 });
    }
  void halos;
}

// --- Böden -------------------------------------------------------------------------

function paintFloor(b, s, scene) {
  const f = floorRect(s);
  const ox = scene.ox, oy = scene.oy;
  const style = s.c % 3; // 0 Kies, 1 Terrakotta-Fliesen (Anbau), 2 Ziegelpflaster
  const G = R.gravel;
  for (let y = f.y; y < f.y + f.h; y++)
    for (let x = f.x; x < f.x + f.w; x++) {
      const cx = x - ox, cy = y - oy;
      let col;
      if (style === 0) {
        const n = noise(cx, cy, 11), n2 = noise(cx >> 2, cy >> 2, 13);
        col = n2 > 0.7 ? mix(G[2], G[3], 0.35) : G[2];
        if (n > 0.94) col = mix(G[3], G[4], 0.4);
        else if (n < 0.05) col = mix(G[1], G[2], 0.4);
        else if (n < 0.12) col = mix(G[1], G[2], 0.7);
      } else if (style === 1) {
        const lx = cx - (Math.floor(cy / 10) % 2) * 6, tx = Math.floor(lx / 12), ty = Math.floor(cy / 10);
        const tn = noise(tx, ty, 17);
        const T = R.tile;
        const base = mix(T[3], C.gh_pumpkin_beige[2], 0.3);
        col = tn > 0.66 ? mix(base, T[2], 0.25) : tn > 0.33 ? base : mix(base, C.gh_pumpkin_beige[3], 0.3);
        if (((lx % 12) + 12) % 12 === 11 || cy % 10 === 9) col = mix(T[2], G[1], 0.45);
        else if (noise(cx, cy, 19) > 0.96) col = mix(base, T[4], 0.5);
      } else {
        const row = Math.floor(cy / 4), off = row % 2 ? 4 : 0;
        const bx = Math.floor((cx + off) / 8);
        const bn = noise(bx, row, 23);
        const B = R.brick;
        col = bn > 0.7 ? mix(B[3], B[2], 0.5) : bn > 0.3 ? mix(B[2], G[2], 0.25) : mix(B[2], B[1], 0.3);
        if (cy % 4 === 3 || (cx + off) % 8 === 0) col = mix(G[1], B[1], 0.4);
      }
      // Moos in Ritzen/Ecken
      const m = noise(cx >> 4, cy >> 3, 29) * 0.7 + noise(cx >> 1, cy >> 1, 31) * 0.3;
      if (m > 0.72) col = mix(col, C.wa_moos[m > 0.78 ? 3 : 2], m > 0.78 ? 0.42 : 0.22);
      b.set(x, y, col);
    }
  // Trittsteine an der Vorderkante des Jochs: geschwungen, mit Lücken
  const rp = rng(`gh:path:${s.c}:${s.r}`);
  const ph = rp() * 6.28, amp = 1 + rp() * 3, gapAt = rp() < 0.6 ? Math.floor(rp() * 8) : -1;
  let x = f.x + 3 + Math.floor(rp() * 6), k = 0;
  while (x < f.x + CW - 9) {
    const w = 8 + Math.floor(rp() * 6), h = 5 + Math.floor(rp() * 3);
    const yy = f.y + CH - 13 + Math.round(Math.sin((x - f.x) / 22 + ph) * amp);
    if (k !== gapAt && k !== gapAt + 1) stepStone(b, x + w / 2, yy + h / 2, w / 2, h / 2, rp);
    else if (rp() < 0.7) for (let t = 0; t < 3; t++) b.set(x + 2 + t * 3, yy + 3 + (t % 2), mix(C.wa_moos[3], R.gravel[2], 0.3));
    x += w + 3 + Math.floor(rp() * 5);
    k++;
  }
  // Grenze zum Nachbarjoch (anderer Boden): Kantenstein-Reihe
  if (s.c > 0) for (let y = f.y; y < f.y + f.h; y++) {
    const S = C.stone;
    b.set(f.x, y, (y >> 2) % 2 ? S[2] : S[3]);
    b.set(f.x + 1, y, (y >> 2) % 2 ? S[1] : S[2]);
  }
  // Kleinkram und Laterne (Hintergrund)
  const T = TYPES[s.type];
  const rk = rng(`gh:clutter:${s.index}`);
  (T.clutter || []).forEach(([lx, ly], n) => {
    const xx = f.x + (s.mirror ? CW - lx : lx), yy = f.y + ly;
    const name = n === 0 ? 'flantern' : pick(rk, CLUTTER);
    if (n > 0 && rk() < 0.25) return;
    scene._clutter.push([name, xx, yy, Math.floor(rk() * 3)]);
  });
  // Schatten hinten (unter Sockel bzw. der Reihe davor)
  if (s.r === 0) for (let x2 = f.x; x2 < f.x + CW; x2++) { b.set(x2, f.y, C.dark[2], 110); b.set(x2, f.y + 1, C.dark[3], 60); }
}

function stepStone(b, cx, cy, rx, ry, rnd) {
  const S = C.stone;
  // Moosring
  b.ellipse(cx, cy + 0.5, rx + 1, ry + 1, mix(C.wa_moos[2], R.gravel[2], 0.3));
  b.ellipse(cx, cy, rx, ry, S[1]);
  b.ellipse(cx - 0.5, cy - 0.5, rx - 0.6, ry - 0.8, S[2]);
  b.ellipse(cx - 1.5, cy - 1.2, rx * 0.5, ry * 0.4, S[3]);
  if (rnd() < 0.5) b.set(Math.round(cx + rx * 0.3), Math.round(cy), C.wa_moos[3]);
}

// --- Glaswand und Giebel -------------------------------------------------------------

function paintWall(b, s, scene, halos, beams) {
  const F = R[FRAMES[s.c % FRAMES.length]];
  const x0 = s.rect.x, y0 = s.rect.y;
  const glassTop = y0 - ROOF + 2;
  // Glas: Himmel scheint durch; untere Scheiben zeigen die Hecke gedämpft
  const HG = R.hedge, haze = [196, 216, 222];
  for (let x = x0; x < x0 + CW; x++) {
    const cx = x - scene.ox;
    const ht = y0 + KNEE - 11 + Math.round(Math.sin(cx / 9) * 2 + Math.sin(cx / 23 + 1) * 2);
    const tt = y0 + KNEE - 22 + Math.round(Math.sin(cx / 17 + 2) * 5 + Math.sin(cx / 7) * 2);
    for (let y = glassTop; y < y0 + KNEE; y++) {
      if (y >= ht) b.set(x, y, mix(noise(cx >> 1, y >> 1, 71) > 0.75 ? HG[3] : HG[2], haze, 0.3));
      else if (y >= tt) b.set(x, y, mix(noise(cx >> 1, y >> 1, 73) > 0.7 ? HG[2] : HG[1], haze, 0.5));
      else b.clear(x, y);
    }
  }
  // Giebel je nach Spalte
  const style = s.c % 3;
  const cx = x0 + CW / 2;
  const roofY = (x) => {
    const t = (x - x0) / CW * 2 - 1; // -1..1
    if (style === 1) return y0 - Math.round((1 - Math.abs(t)) * (ROOF - 6)); // Spitzgiebel
    return y0 - Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * (ROOF - (style === 2 ? 12 : 4))); // Rundbogen
  };
  // über dem Dach: Himmel
  for (let x = x0; x < x0 + CW; x++) for (let y = Math.max(0, glassTop - 2); y < roofY(x); y++) b.clear(x, y);
  // Laternenaufsatz (style 2)
  if (style === 2) {
    const ly = roofY(cx) - 1;
    for (let y = ly - 9; y <= ly; y++) for (let x = cx - 10; x <= cx + 10; x++) {
      const edge = x === cx - 10 || x === cx + 10 || y === ly - 9;
      if (edge) b.set(x, y, F[1]); else if ((x - cx) % 5 === 0) b.set(x, y, F[2]); else b.clear(x, y);
    }
    for (let x = cx - 12; x <= cx + 12; x++) { const k = Math.abs(x - cx); b.set(x, ly - 10 - Math.floor((12 - k) / 4), F[k > 10 ? 0 : 3]); }
    b.vline(cx, ly - 17, ly - 13, F[1]); b.set(cx, ly - 18, F[4]);
  }
  // Rahmen des Giebels
  for (let x = x0; x < x0 + CW; x++) {
    const ry = roofY(x);
    b.set(x, ry, F[0]); b.set(x, ry + 1, F[3]); b.set(x, ry + 2, F[1]);
  }
  // Zierkamm (Cresting) und Spitze
  for (let x = x0 + 6; x < x0 + CW - 6; x += 4) {
    const ry = roofY(x);
    b.set(x, ry - 1, F[1]); b.set(x, ry - 2, F[2]);
    if ((x - x0) % 8 === 2) b.set(x, ry - 3, F[3]);
  }
  if (style !== 2) { const ty = roofY(cx); b.vline(cx, ty - 6, ty - 1, F[1]); b.ellipse(cx + 0.5, ty - 7, 1.6, 1.6, F[3]); }
  // Sprossen: senkrecht alle 18 px, oben Rundbögen
  const panes = 8, pw = CW / panes;
  for (let k = 0; k <= panes; k++) {
    const x = Math.round(x0 + k * pw);
    const thick = k === 0 || k === panes;
    for (let y = roofY(Math.min(x, x0 + CW - 1)) + 2; y < y0 + KNEE; y++) {
      b.set(x, y, F[thick ? 1 : 2]);
      if (thick) b.set(x + (k === 0 ? 1 : -1), y, F[3]);
    }
  }
  // Querriegel und Rundbögen zwischen den Sprossen
  const archY = y0 + 14;
  for (let k = 0; k < panes; k++) {
    const xa = x0 + k * pw, xm = xa + pw / 2;
    for (let x = Math.ceil(xa); x < xa + pw; x++) {
      const t = (x + 0.5 - xm) / (pw / 2);
      const ay = Math.round(archY - Math.sqrt(Math.max(0, 1 - t * t)) * 7);
      b.set(x, ay, F[2]);
      if (ay < archY) b.set(x, ay + 1, F[1]);
    }
    // kleine Rosette im Zwickel
    b.set(Math.round(xa), archY - 8, F[3]);
  }
  b.hline(x0, x0 + CW - 1, archY, F[2]);
  b.hline(x0, x0 + CW - 1, archY + 1, F[1]);
  b.hline(x0, x0 + CW - 1, y0 + 32, F[2]);
  // Glanz und Kondenstropfen auf dem Glas
  for (let y = glassTop; y < y0 + KNEE - 1; y++) for (let x = x0; x < x0 + CW; x++) {
    if (b.get(x, y)) continue;
    if (roofY(x) > y) continue;
    const k = (x - y + 999) % 23;
    if (k === 0 || k === 2) b.set(x, y, [255, 255, 255], 34);
  }
  const rd = rng(`gh:drops:${s.c}`);
  for (let k = 0; k < 46; k++) {
    const x = x0 + 2 + Math.floor(rd() * (CW - 4)), y = y0 + 34 + Math.floor(rd() * (KNEE - 37));
    if (b.get(x, y) && !(y > y0 + KNEE - 16)) continue;
    b.set(x, y, [236, 246, 250], 120);
    if (rd() < 0.25) { b.set(x, y + 1, [236, 246, 250], 70); b.set(x, y + 2, [236, 246, 250], 40); }
  }
  // Ziegelsockel mit Abdeckung
  for (let y = y0 + KNEE; y < y0 + WALL; y++) for (let x = x0; x < x0 + CW; x++) {
    const row = y - y0 - KNEE, off = Math.floor(row / 4) % 2 ? 4 : 0;
    const B = R.brick;
    let col = row % 4 === 3 || (x + off) % 8 === 0 ? B[1] : noise(x - scene.ox, y, 41) > 0.82 ? B[3] : B[2];
    if (noise((x - scene.ox) >> 2, y >> 1, 43) > 0.85) col = mix(col, C.wa_moos[2], 0.45);
    b.set(x, y, col);
  }
  for (let x = x0; x < x0 + CW; x++) { b.set(x, y0 + KNEE - 1, C.stone[3]); b.set(x, y0 + KNEE, C.stone[2]); b.set(x, y0 + KNEE + 1, C.stone[1]); }
  // Thermometer an einer Sprosse
  if (s.c === 0) {
    const tx = Math.round(x0 + pw * 5) + 2, ty = y0 + 20;
    b.rect(tx, ty, 3, 10, C.petal_white[3]); b.vline(tx + 1, ty + 4, ty + 9, C.petal_red[2]); b.rect(tx, ty + 10, 3, 2, C.petal_red[2]);
    b.vline(tx + 3, ty, ty + 11, C.petal_white[1]);
  }
  // Lichterkette mit Glühbirnen unter dem Bogen
  const cols = [[255, 214, 130], [255, 196, 120], [255, 226, 160]];
  for (let k = 0; k < panes; k += 2) {
    const xa = x0 + k * pw + 2, xb = xa + pw * 2 - 4;
    for (let x = Math.round(xa); x <= xb; x++) {
      const t = (x - xa) / (xb - xa);
      const yy = y0 + 3 + Math.round(Math.sin(t * Math.PI) * 5);
      b.set(x, yy, C.dark[3]);
      if ((x - Math.round(xa)) % 6 === 3) {
        const c = cols[(x >> 3) % 3];
        b.set(x, yy + 1, C.dark[3]);
        b.glow(x, yy + 2, c); b.set(x, yy + 2, mix(c, [150, 120, 80], 0.3));
        b.glow(x, yy + 2, c, false);
        b.glow(x, yy + 3, mix(c, [255, 255, 255], 0.3), false); b.set(x, yy + 3, mix(c, [160, 130, 90], 0.3));
        if ((x - Math.round(xa)) % 18 === 3) halos.push({ x: x + 0.5, y: yy + 3, r: 12, rgb: [255, 200, 120], a: 0.3 });
      }
    }
  }
  // Laterne am Pfosten zur nächsten Spalte (oder am Rand)
  const lx = x0 + CW - 1, ly = y0 + 24;
  lanternPx(b, lx, ly, halos);
  if (s.c === 0) lanternPx(b, x0, ly, halos);
  void beams;
}

function lanternPx(b, x, y, halos) {
  const D = C.dark;
  b.vline(x, y - 4, y - 1, D[3]);
  b.hline(x - 2, x + 2, y, D[2]);
  b.hline(x - 1, x + 1, y - 1, D[3]);
  for (let j = 1; j <= 5; j++) {
    b.set(x - 2, y + j, D[2]); b.set(x + 2, y + j, D[2]);
    for (let i = -1; i <= 1; i++) b.glow(x + i, y + j, j < 3 ? C.lamp[3] : C.lamp[2]);
  }
  b.hline(x - 2, x + 2, y + 6, D[2]);
  b.set(x, y + 7, D[3]);
  halos.push({ x: x + 0.5, y: y + 3, r: 26, rgb: [255, 196, 110], a: 0.36 });
}

// --- Ränder -------------------------------------------------------------------------

function paintEdges(b, scene, cells, colBottom, halos) {
  const B = R.brick, S = C.stone;
  // Vorderkante: niedrige Ziegelmauer in Aufsicht (Abdeckstein + Front) je Spalte
  for (const [c, bot] of colBottom) {
    const s = [...cells.values()].find((q) => q.c === c);
    const x0 = s.rect.x - ((colBottom.get(c - 1) ?? -Infinity) >= bot ? 0 : 6), x1 = s.rect.x + CW + ((colBottom.get(c + 1) ?? -Infinity) >= bot ? 0 : 6);
    const door = c === 0;
    const dx0 = s.rect.x + 58, dx1 = s.rect.x + 86;
    for (let x = x0; x < x1; x++) {
      if (door && x >= dx0 && x < dx1) continue;
      b.set(x, bot, S[0]); b.set(x, bot + 1, S[3]); b.set(x, bot + 2, S[2]); b.set(x, bot + 3, S[1]);
      for (let y = bot + 4; y < bot + 10; y++) {
        const row = y - bot - 4, off = Math.floor(row / 3) % 2 ? 3 : 0;
        b.set(x, y, row % 3 === 2 || (x + off) % 6 === 0 ? B[1] : B[2]);
      }
      b.set(x, bot + 10, C.dark[2], 90);
    }
    if (door) {
      // Schwelle, Fußmatte, Laternenpfahl und Stiefel draußen
      for (let x = dx0; x < dx1; x++) { b.set(x, bot + 1, S[3]); b.set(x, bot + 2, S[2]); b.set(x, bot + 3, S[1]); }
      for (const xx of [dx0 - 1, dx1]) for (let y = bot - 6; y < bot + 10; y++) b.set(xx, y, y < bot ? R.frameW[2] : S[1]);
      const my = bot + 6;
      for (let y = my; y < my + 8; y++) for (let x = dx0 + 3; x < dx1 - 3; x++) {
        const e = y === my || y === my + 7 || x === dx0 + 3 || x === dx1 - 4;
        b.set(x, y, e ? R.wicker[1] : (x + y) % 3 ? R.wicker[2] : R.wicker[3]);
      }
      b.art(BUILD.boots(1), dx1 + 8, bot + 14);
      b.art(lampPost(), dx0 - 14, bot + 34);
      halos.push({ x: dx0 - 14, y: bot + 6, r: 30, rgb: [255, 200, 120], a: 0.4 });
      // Trittsteine vom Eingang weg
      const rp = rng('gh:frontpath');
      for (let k = 0; k < 6; k++) stepStone(b, (dx0 + dx1) / 2 + Math.round((rp() - 0.5) * 8), bot + 22 + k * 11, 5 + rp() * 2, 3, rp);
    } else {
      const rr = rng(`gh:front:${c}`);
      const k = rr();
      const x = s.rect.x + 20 + Math.floor(rr() * (CW - 40));
      if (k < 0.5) b.art(outBed(c % 3), x, bot + 30);
      else b.art(flowerClump(c % 3), x, bot + 24);
    }
    // Regentonne an der rechten Ecke der letzten Spalte, Fallrohr
    if (c === Math.max(...colBottom.keys())) {
      const rx = s.rect.x + CW - 6;
      b.art(rainBarrel(), rx, bot + 20);
    }
  }
  // Seitenwände: Pfosten mit Ziegelsockel
  for (const s of cells.values()) {
    for (const side of [-1, 1]) {
      const nb = cells.get(`${s.c + side},${s.r}`);
      if (nb) continue;
      const x = side < 0 ? s.rect.x - 6 : s.rect.x + CW;
      const y0 = s.rect.y + floorOff(s.r), y1 = s.rect.y + s.rect.h + 10;
      for (let y = y0; y < y1; y++) for (let i = 0; i < 6; i++) {
        const row = y >> 2, off = row % 2 ? 3 : 0;
        let col = i === (side < 0 ? 5 : 0) ? R.brick[0] : (y % 4 === 3 || (i + off) % 6 === 0) ? R.brick[1] : R.brick[2];
        if (i === 2 || i === 3) col = y % 4 === 0 ? S[2] : S[3];
        b.set(x + i, y, col);
      }
      if (s.r === 0) {
        // Glas-Seitenwand: Eckpfosten bis unter den Giebel
        const F = R[FRAMES[s.c % FRAMES.length]];
        for (let y = s.rect.y - 6; y < s.rect.y + WALL; y++) {
          for (let i = 1; i < 5; i++) b.set(x + i, y, y >= s.rect.y + KNEE ? (i === 1 || i === 4 ? R.brick[1] : R.brick[2]) : i === 2 ? F[3] : F[i === 1 ? 2 : 1]);
          b.set(x + (side < 0 ? 5 : 0), y, F[0]);
        }
      }
    }
  }
}

// --- Pflanz-Ecken (Hintergrund) --------------------------------------------------------

function paintCorner(b, s, arts, scene) {
  const f = floorRect(s);
  const M = (lx) => f.x + (s.mirror ? CW - lx : lx);
  const MX = (lx0, lx1) => (s.mirror ? [f.x + CW - lx1, f.x + CW - lx0] : [f.x + lx0, f.x + lx1]);
  const Y = (ly) => f.y + ly;
  const seed = hashString(`gh:corner:${s.index}`);
  const rr = rng(`gh:corner:${s.index}`);
  switch (s.type) {
    case 'hochbeet': {
      const st = ['wood', 'wicker', 'brick', 'stone'];
      const a = st[seed % 4], c = st[(seed >> 3) % 4 === seed % 4 ? (seed % 4 + 1) % 4 : (seed >> 3) % 4];
      const [ax0, ax1] = MX(8, 86);
      raisedBed(b, ax0, Y(20), ax1, Y(42), 9, a, seed);
      const [bx0, bx1] = MX(96, 138);
      raisedBed(b, bx0, Y(46), bx1, Y(70), 8, c, seed + 7);
      // Erdsack und Schaufel neben dem Beet
      arts.push([prop('soilbox', seed % 2), M(100), Y(36), Y(36)]);
      break;
    }
    case 'pflanztisch': {
      const [tx0, tx1] = MX(6, 76);
      pottingTable(b, tx0, Y(36), tx1, s.mirror, rr);
      break;
    }
    case 'spirale':
      herbSpiral(b, M(70), Y(60), seed);
      break;
    case 'kuebel': {
      const [zx0, zx1] = MX(74, 130);
      zincTub(b, zx0, Y(26), zx1, Y(38));
      // Rankpyramide hinter dem großen Kübel
      obelisk(b, M(42), Y(80));
      break;
    }
    case 'rundbeet': {
      roundBed(b, M(64), Y(60), 52, 25, seed);
      birdbath(b, M(126), Y(62));
      break;
    }
  }
  void scene; void arts;
}

function paintWallCorner(b, s, arts, halos, scene) {
  const x0 = s.rect.x, y0 = s.rect.y;
  const W = (lx) => x0 + (s.wmirror ? CW - lx : lx);
  const WX = (a, z) => (s.wmirror ? [x0 + CW - z, x0 + CW - a] : [x0 + a, x0 + z]);
  // Fensterbank auf dem Sockel (für Töpfe)
  if (s.wall === 'stellage' || s.wall === 'bank' || s.wall === 'ranke') {
    const [a, z] = s.wall === 'ranke' ? WX(108, 142) : [x0 + 2, x0 + CW - 3];
    sillPx(b, a, z, y0 + KNEE);
  }
  if (s.wall === 'stellage') {
    const [a, z] = WX(22, 88);
    staging(b, a, y0 + 66, z);
    trellisPx(b, ...WX(108, 140), y0 + 8, y0 + KNEE - 2);
  } else if (s.wall === 'ranke') {
    const [a, z] = WX(6, 98);
    trellisPx(b, a, z, y0 + 6, y0 + KNEE - 2);
    trough(b, a, y0 + 56, z, y0 + 62);
  }
  // Hängekörbe: Ketten zum Dach
  for (const p of s.spots) if (p.kind === 'hang') {
    const topY = y0 - 8;
    for (let y = topY; y < p.y - 9; y++) b.set(p.x, y, y % 2 ? C.dark[3] : C.dark[4]);
    b.line(p.x, p.y - 9, p.x - 6, p.y - 1, C.dark[3]);
    b.line(p.x, p.y - 9, p.x + 6, p.y - 1, C.dark[3]);
    hangBasket(b, p.x, p.y);
  }
  // Kreidetafel mit Ernteplan (erstes Joch)
  if (s.index === 0) arts.push([chalkboard(), x0 + 96, y0 + 72, y0 + 66]);
  // Gießkanne aus Zink auf der Fensterbank, wo frei (nur Bank-Variante)
  void halos; void scene;
}

// --- Bausteine (Buf) ------------------------------------------------------------------

/** Erde mit Rauschen und Furchen. */
function soilPx(b, x, y, inside) {
  const E = C.gh_earth;
  const n = noise(x, y, 5);
  let col = E[2];
  if (n > 0.86) col = E[3];
  else if (n < 0.12) col = E[1];
  if (n > 0.975) col = E[4];
  if (inside && noise(x >> 1, y, 7) > 0.985) col = mix(C.leaf[2], E[2], 0.3);
  b.set(x, y, col);
}

/** Hochbeet in Aufsicht: Erde x0..x1/y0..y1, Vorderwand depth px. style: wood|wicker|brick|stone */
function raisedBed(b, x0, y0, x1, y1, depth, style, seed) {
  const ramp = style === 'wood' ? C.wood : style === 'wicker' ? R.wicker : style === 'brick' ? R.brick : C.stone;
  for (let y = y0 + 2; y <= y1 - 1; y++) for (let x = x0 + 2; x <= x1 - 2; x++) soilPx(b, x, y, true);
  // Schatten der Hinterkante auf der Erde
  for (let x = x0 + 2; x <= x1 - 2; x++) b.set(x, y0 + 2, C.gh_earth[1]);
  // Rand oben (Aufsicht)
  const rim = (x, y) => {
    if (style === 'stone') { const n = noise(x >> 1, y >> 1, seed); return n > 0.6 ? ramp[3] : n > 0.25 ? ramp[2] : ramp[1]; }
    if (style === 'wicker') return (x + y) % 3 === 0 ? ramp[2] : ramp[3];
    if (style === 'brick') return (x % 4 === 0) ? ramp[1] : ramp[3];
    return ramp[3];
  };
  for (let x = x0; x <= x1; x++) { b.set(x, y0, rim(x, y0)); b.set(x, y0 + 1, rim(x, y0 + 1)); b.set(x, y1, ramp[4]); }
  for (let y = y0; y <= y1; y++) { b.set(x0, y, rim(x0, y)); b.set(x0 + 1, y, rim(x0 + 1, y)); b.set(x1 - 1, y, rim(x1 - 1, y)); b.set(x1, y, ramp[1]); }
  // Vorderwand
  for (let y = y1 + 1; y <= y1 + depth; y++) for (let x = x0; x <= x1; x++) {
    const k = y - y1 - 1;
    let col = ramp[2];
    if (style === 'wood') {
      col = k % 3 === 2 ? ramp[1] : x === x0 ? ramp[3] : ramp[2];
      if ((x - x0) % 29 === 14) col = ramp[1];
    } else if (style === 'wicker') {
      col = ((x >> 1) + k) % 2 ? ramp[2] : ramp[3];
      if (k % 2 === 1 && (x >> 1) % 2) col = ramp[1];
    } else if (style === 'brick') {
      const off = Math.floor(k / 3) % 2 ? 3 : 0;
      col = k % 3 === 2 || (x + off) % 6 === 0 ? ramp[1] : ramp[2];
    } else {
      const n = noise(x >> 2, (y + (x >> 2)) >> 1, seed + 3);
      col = n > 0.7 ? mix(ramp[2], ramp[3], 0.6) : n > 0.3 ? ramp[2] : mix(ramp[1], ramp[2], 0.5);
      if (k === 0 || (k === 4 && (x >> 2) % 2)) col = mix(ramp[1], ramp[2], 0.3);
      if (noise(x >> 2, y >> 1, seed + 5) > 0.88) col = mix(col, C.wa_moos[2], 0.5);
    }
    if (x === x1) col = ramp[1];
    b.set(x, y, col);
  }
  for (let x = x0; x <= x1; x++) b.set(x, y1 + depth + 1, ramp[0]);
  for (let y = y0; y <= y1 + depth; y++) { b.set(x0 - 1, y, ramp[0]); b.set(x1 + 1, y, ramp[0]); }
  for (let x = x0 - 1; x <= x1 + 1; x++) b.set(x, y0 - 1, ramp[0]);
  // Eckpfosten (Holz)
  if (style === 'wood') for (const px of [x0, x1 - 2]) for (let y = y0 - 2; y <= y1 + depth; y++) {
    b.set(px, y, ramp[3]); b.set(px + 1, y, ramp[2]); b.set(px + 2, y, ramp[1]);
  }
  // Bodenschatten rechts unten
  for (let x = x0 + 2; x <= x1 + 2; x++) b.set(x, y1 + depth + 2, C.dark[2], 60);
  for (let y = y0 + 2; y <= y1 + depth + 1; y++) b.set(x1 + 2, y, C.dark[2], 50);
  // Namensschild an der Front
  if (seed % 3 === 0) {
    const sx = x0 + 6 + (seed % 7);
    b.rect(sx, y1 + 2, 7, 4, C.cream[3]);
    b.hline(sx + 1, sx + 5, y1 + 3, C.cream[1]);
    b.hline(sx + 1, sx + 3, y1 + 4, C.cream[1]);
    b.hline(sx, sx + 6, y1 + 6, C.cream[0]);
  }
}

function roundBed(b, cx, cy, rx, ry, seed) {
  const B = R.brick;
  // Vorderwand (Ziegelkante 4 px hoch)
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 6; y++)
    for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const d = ((x + 0.5 - cx) / (rx + 1)) ** 2 + ((y + 0.5 - cy) / (ry + 1)) ** 2;
      const dDown = ((x + 0.5 - cx) / (rx + 1)) ** 2 + ((y - 4.5 - cy) / (ry + 1)) ** 2;
      if (d > 1 && dDown <= 1 && y > cy) {
        const ang = Math.atan2(y - cy, x - cx);
        const seg = Math.floor((ang + Math.PI) * 9);
        b.set(x, y, (y - cy) % 3 === 0 ? B[1] : seg % 2 ? B[2] : mix(B[2], B[3], 0.4));
      }
    }
  b.ellipse(cx, cy, rx + 2, ry + 2, B[0]);
  // Ziegelkranz oben (Rollschicht)
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const d = ((x + 0.5 - cx) / (rx + 1)) ** 2 + ((y + 0.5 - cy) / (ry + 1)) ** 2;
      if (d > 1) continue;
      const di = ((x + 0.5 - cx) / (rx - 2)) ** 2 + ((y + 0.5 - cy) / (ry - 2)) ** 2;
      if (di <= 1) soilPx(b, x, y, true);
      else {
        const ang = Math.atan2((y - cy) * rx / ry, x - cx);
        const seg = Math.floor((ang + Math.PI) * 10);
        b.set(x, y, seg % 2 ? B[3] : mix(B[3], B[4], 0.5));
        if (y < cy && di < 1.25) b.set(x, y, B[1]);
      }
    }
  // Schatten unten rechts
  for (let x = Math.floor(cx - rx * 0.6); x <= cx + rx; x++) b.set(x, Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / (rx + 2)) ** 2))) + 7, C.dark[2], 50);
  void seed;
}

function herbSpiral(b, cx, cy, seed) {
  const S = C.stone;
  const tiers = [[36, 22, 0], [25, 15, 7], [14, 9, 13]];
  for (const [rx, ry, h] of tiers) {
    const yc = cy - h;
    // Mauer (Front)
    for (let y = Math.floor(yc); y <= yc + ry + 5; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const d = ((x + 0.5 - cx) / (rx + 1)) ** 2 + ((y + 0.5 - yc) / (ry + 1)) ** 2;
        const dd = ((x + 0.5 - cx) / (rx + 1)) ** 2 + ((y - 4.5 - yc) / (ry + 1)) ** 2;
        if (d > 1 && dd <= 1) {
          const n = noise((x + (y >> 1)) >> 2, y >> 1, seed + h);
          let col = n > 0.66 ? S[3] : n > 0.3 ? S[2] : S[1];
          if ((y - yc) % 3 === 0 && noise(x, y, seed) > 0.5) col = S[1];
          if (noise(x >> 1, y >> 1, seed + 9) > 0.9) col = C.wa_moos[3];
          b.set(x, y, col);
        }
      }
    // Oberseite: Steinkranz + Erde
    for (let y = Math.floor(yc - ry - 1); y <= yc + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const d = ((x + 0.5 - cx) / (rx + 1)) ** 2 + ((y + 0.5 - yc) / (ry + 1)) ** 2;
        if (d > 1) continue;
        if (d > 0.78) {
          const n = noise(x >> 1, y >> 1, seed + 2);
          b.set(x, y, n > 0.5 ? S[4] : S[3]);
          if (d > 0.93) b.set(x, y, S[1]);
        } else soilPx(b, x, y, true);
      }
  }
  // Spiralfuge: ein Steinband, das sich nach innen windet
  for (let t = 0; t < 1; t += 0.004) {
    const a = t * Math.PI * 3.2 + 0.6, rx = 34 - t * 26, ry = 20 - t * 14, h = t * 13;
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy - h + Math.sin(a) * ry);
    if (Math.sin(a) < 0) b.set(x, y, S[3]);
  }
}

function zincTub(b, x0, y0, x1, y1) {
  const Z = R.zinc;
  for (let y = y0 + 2; y < y1; y++) for (let x = x0 + 2; x <= x1 - 2; x++) soilPx(b, x, y, true);
  for (let x = x0 + 2; x <= x1 - 2; x++) b.set(x, y0 + 2, C.gh_earth[1]);
  for (let x = x0; x <= x1; x++) { b.set(x, y0, Z[3]); b.set(x, y0 + 1, Z[4]); b.set(x, y1, Z[4]); }
  for (let y = y0; y <= y1; y++) { b.set(x0, y, Z[3]); b.set(x0 + 1, y, Z[4]); b.set(x1 - 1, y, Z[3]); b.set(x1, y, Z[2]); }
  for (let y = y1 + 1; y <= y1 + 9; y++) for (let x = x0 + 1; x <= x1 - 1; x++) {
    const k = y - y1;
    b.set(x, y, k % 3 === 0 ? Z[1] : x < x0 + 4 ? Z[3] : x > x1 - 4 ? Z[1] : Z[2]);
  }
  for (let y = y0; y <= y1 + 9; y++) { b.set(x0 - 1, y, Z[0]); b.set(x1 + 1, y, Z[0]); }
  for (let x = x0; x <= x1; x++) { b.set(x, y0 - 1, Z[0]); b.set(x, y1 + 10, Z[0]); b.set(x + 2, y1 + 11, C.dark[2], 60); }
  // Griffe
  for (const gx of [x0 - 3, x1 + 2]) { b.rect(gx, y1 + 2, 2, 3, Z[1]); b.set(gx, y1 + 2, Z[3]); }
}

function obelisk(b, x, y) {
  // Rankpyramide aus Holzstäben hinter dem Kübel (Spitze mit Kugel)
  const W = C.wood, top = y - 44;
  for (const dx of [-8, -3, 3, 8]) b.line(x + dx, y - 6, x + Math.sign(dx) * 1, top + 4, dx < 0 ? W[3] : W[1]);
  for (let k = 1; k <= 3; k++) {
    const yy = y - 6 - k * 10, w = Math.round(8 - k * 2.2);
    b.hline(x - w, x + w, yy, W[2]);
  }
  b.ellipse(x + 0.5, top + 2, 2, 2, W[3]);
  b.set(x, top + 1, W[4]);
}

function birdbath(b, x, y) {
  const S = C.stone;
  b.rect(x - 2, y - 8, 4, 9, S[2]);
  b.vline(x - 2, y - 8, y, S[3]); b.vline(x + 1, y - 8, y, S[1]);
  b.ellipse(x + 0.5, y + 1, 5, 1.6, S[1]);
  b.ellipse(x + 0.5, y - 10, 8, 3, S[1]);
  b.ellipse(x + 0.5, y - 10.5, 7, 2.4, S[3]);
  b.ellipse(x + 0.5, y - 10.5, 5, 1.6, R.zinc[3]);
  b.set(x - 2, y - 11, [240, 250, 255]);
  b.hline(x + 1, x + 3, y - 10, [190, 220, 230]);
}

function pottingTable(b, x0, ty, x1, mirror, rr) {
  const W = C.wood, D = R.oak;
  // Beine und Zwischenboden
  for (const lx of [x0 + 2, x1 - 4]) for (let y = ty + 2; y <= ty + 18; y++) { b.set(lx, y, W[3]); b.set(lx + 1, y, W[2]); b.set(lx + 2, y, W[1]); }
  for (let x = x0 + 2; x <= x1 - 2; x++) { b.set(x, ty + 12, W[3]); b.set(x, ty + 13, W[1]); }
  // Zwischenboden: Topfstapel und Säckchen
  for (let k = 0; k < 3; k++) {
    const px = x0 + 10 + k * 4;
    b.rect(px, ty + 8 - k, 6, 4, C.terracotta[2 + (k % 2)]);
    b.hline(px, px + 5, ty + 8 - k, C.terracotta[4]);
  }
  b.rect(x1 - 22, ty + 6, 9, 6, R.burlap[2]); b.hline(x1 - 22, x1 - 14, ty + 6, R.burlap[3]); b.vline(x1 - 14, ty + 6, ty + 11, R.burlap[1]);
  b.rect(x1 - 20, ty + 4, 5, 2, R.burlap[1]);
  // Platte (Oberseite + Kante)
  for (let x = x0; x <= x1; x++) {
    b.set(x, ty - 3, D[0]); b.set(x, ty - 2, W[2]); b.set(x, ty - 1, W[3]); b.set(x, ty, W[3]);
    b.set(x, ty + 1, W[4]); b.set(x, ty + 2, W[2]); b.set(x, ty + 3, D[0]);
  }
  for (let y = ty - 3; y <= ty + 3; y++) { b.set(x0, y, D[0]); b.set(x1, y, D[0]); }
  for (let x = x0 + 1; x <= x1 + 2; x++) b.set(x, ty + 19, C.dark[2], 60);
  // auf der Platte: Saatgut-Tütchen, Schaufel, Bindfaden (zwischen den Topfplätzen)
  const L = (lx) => (mirror ? x1 - (lx - x0) : lx);
  const pc = [C.petal_red, C.petal_yellow, C.leaf, C.petal_blue, C.petal_orange];
  for (let k = 0; k < 3; k++) {
    const px = L(x0 + 30 + k * 4) - (mirror ? 4 : 0), py = ty - 6 + (k % 2);
    const col = pc[Math.floor(rr() * pc.length)];
    b.rect(px, py, 4, 5, C.cream[3]);
    b.hline(px, px + 3, py, C.cream[4]);
    b.rect(px + 1, py + 2, 2, 2, col[2]);
    b.set(px + 1, py + 2, col[3]);
    b.vline(px + 3, py + 1, py + 4, C.cream[1]);
  }
  // Schäufelchen
  const sx = L(x0 + 64);
  b.line(sx - 4, ty - 2, sx + 1, ty - 2, W[3]);
  b.rect(mirror ? sx - 9 : sx + 2, ty - 3, 4, 3, R.zinc[3]);
  b.set(mirror ? sx - 9 : sx + 5, ty - 1, R.zinc[1]);
  // Bindfadenrolle
  const bx = L(x0 + 42) + (mirror ? -2 : 2);
  b.ellipse(bx + 0.5, ty - 2, 2, 1.5, C.gh_pumpkin_beige[3]);
  b.set(bx, ty - 3, C.gh_pumpkin_beige[4]);
}

function sillPx(b, x0, x1, y) {
  const W = C.wood;
  for (let x = x0; x <= x1; x++) {
    b.set(x, y - 3, W[0]); b.set(x, y - 2, W[2]); b.set(x, y - 1, W[3]); b.set(x, y, W[3]);
    b.set(x, y + 1, W[4]); b.set(x, y + 2, W[2]); b.set(x, y + 3, W[0]); b.set(x, y + 4, C.dark[2], 70);
  }
  for (let y2 = y - 3; y2 <= y + 3; y2++) { b.set(x0, y2, W[0]); b.set(x1, y2, W[0]); }
  // Konsolen
  for (const cx of [x0 + 6, x1 - 6]) { b.vline(cx, y + 4, y + 9, W[1]); b.line(cx, y + 9, cx + (cx < (x0 + x1) / 2 ? 3 : -3), y + 4, W[1]); }
}

function staging(b, x0, y, x1) {
  // Stellage: Lattenrost auf Böcken, Oberseite y-2..y, Beine bis y+12
  const W = C.wood;
  for (const lx of [x0 + 2, x1 - 4, (x0 + x1) >> 1]) for (let yy = y + 2; yy <= y + 12; yy++) { b.set(lx, yy, W[3]); b.set(lx + 1, yy, W[2]); b.set(lx + 2, yy, W[1]); }
  for (let x = x0 + 2; x <= x1 - 2; x++) b.set(x, y + 8, W[1]);
  for (let x = x0; x <= x1; x++) {
    b.set(x, y - 3, W[0]);
    b.set(x, y - 2, (x - x0) % 5 === 4 ? W[1] : W[3]);
    b.set(x, y - 1, (x - x0) % 5 === 4 ? W[1] : W[3]);
    b.set(x, y, W[4]); b.set(x, y + 1, W[2]); b.set(x, y + 2, W[0]);
  }
  for (let x = x0 + 1; x <= x1 + 2; x++) b.set(x, y + 13, C.dark[2], 60);
}

function trellisPx(b, x0, x1, y0, y1) {
  // Rankgitter (Holzlatten, diagonal) vor der Glaswand
  const W = C.wood;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const a = (x - x0 + y - y0) % 10, d = (x - x0 - (y - y0) + 1000) % 10;
    if (a === 0) b.set(x, y, W[3]);
    else if (d === 0) b.set(x, y, W[2]);
  }
  for (let y = y0; y <= y1; y++) { b.set(x0, y, W[3]); b.set(x1, y, W[1]); }
  for (let x = x0; x <= x1; x++) { b.set(x, y0, W[3]); b.set(x, y1, W[1]); }
  // ein paar Ranken mit Blättchen
  const rr = rng(`gh:vine:${x0}:${y0}`);
  for (let k = 0; k < 3; k++) {
    let x = x0 + 4 + Math.floor(rr() * (x1 - x0 - 8)), y = y1 - 1;
    while (y > y0 + 6) {
      b.set(x, y, C.stem[2]);
      if (rr() < 0.3) { b.set(x - 1, y, C.leaf[3]); b.set(x - 1, y - 1, C.leaf[2]); }
      if (rr() < 0.3) { b.set(x + 1, y, C.leaf[2]); b.set(x + 1, y + 1, C.leaf[1]); }
      y--; if (rr() < 0.35) x += rr() < 0.5 ? -1 : 1;
      x = Math.max(x0 + 1, Math.min(x1 - 1, x));
    }
  }
}

function trough(b, x0, y0, x1, y1) {
  // Pflanzkasten vor dem Sockel: Erde y0..y1, Front bis y1+8
  const W = C.wood;
  for (let y = y0 + 2; y < y1; y++) for (let x = x0 + 2; x <= x1 - 2; x++) soilPx(b, x, y, true);
  for (let x = x0; x <= x1; x++) { b.set(x, y0, W[3]); b.set(x, y0 + 1, W[2]); b.set(x, y1, W[4]); }
  for (let y = y0; y <= y1; y++) { b.set(x0, y, W[3]); b.set(x0 + 1, y, W[2]); b.set(x1 - 1, y, W[2]); b.set(x1, y, W[1]); }
  for (let y = y1 + 1; y <= y1 + 8; y++) for (let x = x0; x <= x1; x++) b.set(x, y, (y - y1) % 4 === 0 ? W[1] : x === x0 ? W[3] : W[2]);
  for (let x = x0 - 1; x <= x1 + 1; x++) { b.set(x, y0 - 1, W[0]); b.set(x, y1 + 9, W[0]); b.set(x + 2, y1 + 10, C.dark[2], 60); }
  for (let y = y0; y <= y1 + 8; y++) { b.set(x0 - 1, y, W[0]); b.set(x1 + 1, y, W[0]); }
}

function hangBasket(b, x, y) {
  // Drahtkorb mit Moos, Erde bei y
  const M = C.wa_moos;
  for (let j = 0; j <= 6; j++) {
    const w = Math.round(7 * Math.sqrt(1 - (j / 7) ** 2));
    for (let i = -w; i <= w; i++) {
      const n = noise(x + i, y + j, 61);
      b.set(x + i, y + j, j === 0 ? M[4] : n > 0.6 ? M[3] : n > 0.25 ? M[2] : M[1]);
    }
    b.set(x - w - 1, y + j, C.dark[3]); b.set(x + w + 1, y + j, C.dark[3]);
  }
  for (let i = -6; i <= 6; i++) soilPx(b, x + i, y - 1, false);
  b.hline(x - 7, x + 7, y, C.dark[4]);
  b.hline(x - 3, x + 3, y + 7, C.dark[3]);
}

// --- PixelArt-Teile ------------------------------------------------------------------

function potArt(v, big = false) {
  return sprite(`gh|pot|${v % POTS.length}|${big}`, () => {
    const w = big ? 18 : 14, h = big ? 16 : 12;
    const a = new PixelArt(w, h);
    const ramp = big ? 'terracotta' : POTS[v % POTS.length];
    const cx = w / 2;
    trap(a.layer(ramp), cx, 4, h - 2, w - 4, w - 7);
    const band = a.layer(ramp, { outline: false, shading: false });
    if (big) for (let x = 3; x < w - 3; x++) band.set(x, 9, SHADE).set(x, 8, HIGH);
    a.layer(ramp).rect(1, 1, w - 2, 3);
    const soil = a.layer('gh_earth', { outline: false, shading: false });
    for (let x = 3; x <= w - 4; x++) soil.set(x, 1, x % 3 ? BASE : LIGHT).set(x, 2, SHADE);
    return fin(a, Math.floor(cx), 1);
  });
}
function sackArt(v) {
  return sprite(`gh|sack|${v % 2}`, () => {
    const a = new PixelArt(22, 13);
    const ramp = v % 2 ? HX.felt : HX.burlap;
    const s = a.layer(ramp);
    s.rect(2, 3, 18, 8);
    s.rect(3, 11, 16, 1);
    const roll = a.layer(ramp, { outline: false, shading: false });
    for (let x = 2; x <= 19; x++) roll.set(x, 3, HIGH).set(x, 4, LIGHT);
    for (const x of [6, 13, 17]) roll.set(x, 8, SHADE).set(x + 1, 9, SHADE);
    const soil = a.layer('gh_earth', { outline: false, shading: false });
    for (let x = 4; x <= 17; x++) soil.set(x, 1, x % 4 ? BASE : LIGHT).set(x, 2, SHADE);
    soil.set(3, 2, BASE).set(18, 2, BASE);
    if (!(v % 2)) {
      const lab = a.layer('cream', { outline: false, shading: false });
      lab.rect(8, 6, 6, 3, LIGHT);
      lab.set(9, 7, SHADE).set(10, 7, SHADE).set(12, 7, SHADE);
    }
    return fin(a, 11, 1);
  });
}
function crateArt(v) {
  return sprite(`gh|crate|${v % 2}`, () => {
    const a = new PixelArt(24, 14);
    const ramp = v % 2 ? HX.oak : 'wood';
    const c = a.layer(ramp, { shading: false });
    for (let y = 3; y <= 12; y++) for (let x = 2; x <= 21; x++) c.set(x, y, y === 3 ? HIGH : (y - 4) % 3 === 2 ? SHADE : x === 2 ? LIGHT : x === 21 ? SHADE : BASE);
    for (const x of [2, 21]) c.set(x, 1, LIGHT).set(x, 2, BASE);
    const soil = a.layer('gh_earth', { outline: false, shading: false });
    for (let x = 3; x <= 20; x++) soil.set(x, 1, x % 3 ? BASE : LIGHT).set(x, 2, SHADE);
    const st = a.layer(v % 2 ? 'cream' : 'leaf_deep', { outline: false, shading: false });
    st.rect(9, 6, 6, 1, v % 2 ? SHADE : BASE).set(10, 8, BASE).set(12, 8, BASE);
    return fin(a, 12, 1);
  });
}
function barrelArt() {
  return sprite('gh|barrel', () => {
    const a = new PixelArt(26, 16);
    const b = a.layer(HX.oak, { shading: false });
    for (let y = 3; y <= 14; y++) {
      const w = 11 - (y > 11 ? y - 11 : 0);
      for (let x = 13 - w; x <= 12 + w; x++) b.set(x, y, (x - 2) % 4 === 0 ? SHADE : x < 13 - w + 2 ? LIGHT : x > 10 + w ? SHADE : BASE);
    }
    const hoop = a.layer('dark', { outline: false, shading: false });
    for (const y of [5, 11]) for (let x = 2; x <= 23; x++) hoop.set(x, y, x < 8 ? HIGH : LIGHT);
    const rim = a.layer(HX.oak, { outline: false, shading: false });
    for (let x = 2; x <= 23; x++) rim.set(x, 2, HIGH);
    const soil = a.layer('gh_earth', { outline: false, shading: false });
    for (let x = 4; x <= 21; x++) soil.set(x, 1, x % 3 ? BASE : LIGHT);
    return fin(a, 13, 1);
  });
}
const POTART = { pot: (v) => potArt(v), big: (v) => potArt(v, true), sack: (v) => sackArt(v), crate: (v) => crateArt(v), barrel: () => barrelArt() };

function chalkboard() {
  return sprite('gh|chalk', () => {
    const a = new PixelArt(30, 26);
    const legs = a.layer('wood', { outline: false, shading: false });
    legs.line(4, 4, 2, 25, SHADE).line(25, 4, 27, 25, OUTLINE);
    const fr = a.layer('wood');
    fr.rect(3, 1, 24, 17);
    const bd = a.layer(HX.chalk, { outline: false, shading: false });
    bd.rect(5, 3, 20, 13, BASE);
    text(bd, 6, 4, 'ERNTE', HIGH);
    const ch = a.layer(HX.chalk, { outline: false, shading: false });
    for (let x = 6; x <= 19; x++) if (x % 3) ch.set(x, 11, LIGHT);
    for (let x = 6; x <= 16; x++) if (x % 4) ch.set(x, 13, LIGHT);
    // kleine Tomate in Kreide und ein Haken
    const tm = a.layer('petal_red', { outline: false, shading: false });
    tm.set(21, 12, LIGHT).set(22, 12, LIGHT).set(21, 13, BASE).set(22, 13, BASE);
    a.layer('leaf', { outline: false, shading: false }).set(21, 11, LIGHT).set(22, 11, HIGH);
    a.layer('leaf', { outline: false, shading: false }).set(17, 9, HIGH).set(18, 10, HIGH).set(19, 9, HIGH).set(20, 8, HIGH);
    return fin(a, 15, 25);
  });
}

function lampPost() {
  const a = new PixelArt(10, 34);
  const pole = a.layer(HX.frameG);
  pole.rect(4, 10, 2, 20);
  pole.rect(2, 28, 6, 4);
  const head = a.layer(HX.frameG);
  head.rect(1, 2, 8, 2);
  head.rect(2, 9, 6, 1);
  head.set(4, 0).set(5, 0).set(4, 1).set(5, 1);
  const g = a.layer('lamp', { outline: false, shading: false, glow: true });
  g.rect(2, 4, 6, 5, BASE);
  g.rect(3, 4, 2, 3, HIGH);
  a.layer(HX.frameG, { outline: false, shading: false }).set(1, 6, LIGHT).set(8, 6, LIGHT);
  return fin(a, 5, 32);
}

function rainBarrel() {
  const a = new PixelArt(20, 34);
  const pipe = a.layer(R.zinc ? HX.zinc : 'stone');
  pipe.rect(14, 0, 2, 14);
  pipe.rect(10, 13, 6, 2);
  const b = a.layer(HX.oak, { shading: false });
  for (let y = 16; y <= 32; y++) for (let x = 2; x <= 17; x++) b.set(x, y, x === 2 || x === 3 ? LIGHT : x >= 16 ? SHADE : (x % 4 === 1 ? SHADE : BASE));
  const hoop = a.layer('dark', { outline: false, shading: false });
  for (const y of [19, 28]) for (let x = 2; x <= 17; x++) hoop.set(x, y, x < 6 ? HIGH : LIGHT);
  const top = a.layer('bw_skyblue', { outline: false, shading: false });
  for (let x = 4; x <= 15; x++) top.set(x, 15, x < 8 ? HIGH : LIGHT).set(x, 16, BASE);
  const lid = a.layer(HX.oak, { outline: false, shading: false });
  for (let x = 2; x <= 17; x++) lid.set(x, 14, HIGH);
  // Moos am Fuß
  const m = a.layer('wa_moos', { outline: false, shading: false });
  for (const x of [3, 4, 9, 15, 16]) m.set(x, 33, LIGHT);
  return fin(a, 10, 33);
}

function outBed(v) {
  return sprite(`gh|outbed|${v % 3}`, () => {
    const a = new PixelArt(32, 18);
    const fr = a.layer('wood');
    fr.rect(2, 8, 28, 8);
    const soil = a.layer('gh_earth', { outline: false, shading: false });
    for (let x = 4; x <= 27; x++) for (let y = 8; y <= 11; y++) soil.set(x, y, y === 8 ? SHADE : (x + y) % 5 ? BASE : LIGHT);
    const fr2 = a.layer('wood', { outline: false, shading: false });
    for (let x = 2; x <= 29; x++) fr2.set(x, 12, HIGH).set(x, 15, SHADE);
    // Salat, Kohl oder Möhren
    if (v % 3 === 0) for (const x of [7, 15, 23]) { const l = a.layer(x === 15 ? 'leaf_sage' : 'leaf'); l.ellipse(x, 8, 3.2, 2.6); }
    else if (v % 3 === 1) for (const x of [6, 11, 16, 21, 26]) a.layer('leaf', { outline: false, shading: false }).line(x, 10, x - 1, 6, LIGHT).line(x, 10, x + 1, 5, BASE).set(x - 1, 6, HIGH);
    else for (const x of [8, 18, 25]) { a.layer('petal_purple').ellipse(x, 8, 2.6, 2.2); a.layer('leaf', { outline: false, shading: false }).set(x - 1, 6, LIGHT).set(x + 1, 6, BASE); }
    return fin(a, 16, 16);
  });
}
function bushArt(v) {
  return sprite(`gh|bush|${v % 2}`, () => {
    const a = new PixelArt(26, 17);
    const l = a.layer(v % 2 ? 'leaf' : HX.hedge);
    l.ellipse(9, 10, 8, 6).ellipse(17, 9, 8, 7);
    const fl = a.layer(v % 2 ? 'petal_white' : 'petal_pink', { outline: false, shading: false });
    for (const [x, y] of [[6, 7], [12, 5], [18, 6], [21, 10], [9, 11], [15, 12]]) fl.set(x, y, LIGHT);
    return fin(a, 13, 16);
  });
}
function flowerClump(v) {
  return sprite(`gh|flowers|${v % 3}`, () => {
    const a = new PixelArt(16, 11);
    const st = a.layer('leaf', { outline: false, shading: false });
    for (const x of [3, 6, 8, 11, 13]) st.line(x, 10, x + (x % 2 ? 1 : -1), 4, x % 2 ? BASE : LIGHT);
    const col = ['petal_yellow', 'petal_blue', 'petal_pink'][v % 3];
    const fl = a.layer(col, { outline: false, shading: false });
    for (const [x, y] of [[4, 3], [5, 4], [7, 2], [12, 3], [13, 4], [10, 5], [2, 5]]) fl.set(x, y, (x + y) % 2 ? LIGHT : HIGH);
    return fin(a, 8, 10);
  });
}
function stones() {
  return sprite('gh|stones', () => {
    const a = new PixelArt(20, 9);
    a.layer('stone').ellipse(6, 5, 4, 2.6);
    a.layer('stone').ellipse(13, 6, 3, 2);
    a.layer('wa_moos', { outline: false, shading: false }).set(4, 3, LIGHT).set(5, 3, HIGH).set(14, 4, LIGHT);
    return fin(a, 10, 8);
  });
}

const BUILD = {
  stake(v) {
    const a = new PixelArt(7, 11);
    a.layer('wood', { outline: false, shading: false }).line(3, 5, 3, 10, SHADE);
    const l = a.layer(['cream', 'petal_white', 'gh_butternut'][v % 3]);
    l.rect(1, 1, 5, 4, LIGHT);
    const t = a.layer(['leaf_deep', 'petal_red', 'leaf'][v % 3], { outline: false, shading: false });
    t.set(2, 2, BASE).set(3, 2, LIGHT).set(4, 3, SHADE);
    return fin(a, 3, 10);
  },
  sprout(v) {
    // Keimling(e) im Boden
    const a = new PixelArt(13, 8);
    const g = a.layer('leaf', { outline: false, shading: false });
    const xs = [[6], [4, 9], [3, 6, 10]][v % 3];
    for (const x of xs) {
      g.line(x, 7, x, 5, SHADE);
      g.set(x - 1, 4, LIGHT).set(x - 2, 4, BASE).set(x + 1, 4, HIGH).set(x + 2, 3, LIGHT);
    }
    const s = a.layer('gh_earth', { outline: false, shading: false });
    for (const x of xs) s.set(x - 1, 7, LIGHT).set(x + 1, 7, BASE);
    return fin(a, 6, 7);
  },
  trowel() {
    // Pflanzschaufel steckt in der Erde
    const a = new PixelArt(9, 13);
    a.layer('wood').rect(4, 1, 2, 5);
    a.layer(HX.zinc).rect(3, 7, 4, 4);
    a.layer(HX.zinc, { outline: false, shading: false }).set(4, 11, BASE).set(5, 11, SHADE);
    return fin(a, 4, 12);
  },
  packet(v) {
    // Saatgut-Tütchen auf einem Stab
    const a = new PixelArt(9, 13);
    a.layer('wood', { outline: false, shading: false }).line(4, 8, 4, 12, SHADE);
    const p = a.layer('cream');
    p.rect(1, 1, 7, 7);
    const col = ['petal_red', 'petal_orange', 'petal_purple'][v % 3];
    a.layer(col, { outline: false, shading: false }).ellipse(4, 4.5, 2, 1.8, BASE).set(3, 4, LIGHT);
    a.layer('leaf', { outline: false, shading: false }).set(4, 2, LIGHT).set(5, 2, BASE);
    return fin(a, 4, 12);
  },
  trail(v) {
    // kleine Hängepflanze im leeren Korb (Efeu)
    const a = new PixelArt(18, 16);
    const st = a.layer('stem', { outline: false, shading: false });
    st.line(3, 2, 2, 10 + v, SHADE).line(14, 2, 15, 13 - v, SHADE);
    const lv = a.layer('leaf');
    for (const [x, y] of [[4, 1], [8, 0], [12, 1], [2, 6], [1, 10 + v], [15, 5], [15, 10 - v]]) lv.rect(x, y, 2, 2);
    return fin(a, 9, 2);
  },
  boots(v) {
    const a = new PixelArt(14, 12);
    const ramp = ['leaf_deep', 'petal_yellow', 'petal_red'][v % 3];
    for (const [x, y] of [[2, 1], [7, 2]]) {
      const b = a.layer(ramp);
      b.rect(x, y, 4, 7);
      b.rect(x, y + 6, 6, 3);
      a.layer(ramp, { outline: false, shading: false }).rect(x, y, 4, 1, HIGH);
      a.layer('dark', { outline: false, shading: false }).rect(x, y + 9, 6, 1, HIGH);
    }
    return fin(a, 7, 11);
  },
  barrow(v) {
    const a = new PixelArt(26, 15);
    const hd = a.layer('wood', { outline: false, shading: false });
    hd.line(8, 7, 0, 10, BASE).line(8, 8, 1, 11, SHADE);
    const legs = a.layer('dark', { outline: false, shading: false });
    legs.line(10, 10, 9, 14, HIGH).line(16, 10, 15, 14, LIGHT);
    trap(a.layer(v % 2 ? HX.zinc : 'leaf_deep'), 14, 3, 9, 17, 10);
    const ld = a.layer(v % 2 ? 'gh_earth' : 'gh_butternut', { outline: false, shading: false });
    for (let x = 7; x <= 20; x++) ld.set(x, 3, x % 4 ? BASE : LIGHT);
    if (!(v % 2)) for (const x of [9, 13, 17]) ld.set(x, 2, HIGH).set(x + 1, 2, LIGHT);
    const wh = a.layer('dark');
    wh.ellipse(20.5, 11.5, 2.5, 2.5);
    wh.set(20, 11, HIGH);
    return fin(a, 13, 14);
  },
  harvest(v) {
    // Weidenkorb mit Ernte
    const a = new PixelArt(18, 12);
    const k = a.layer(HX.wicker, { shading: false });
    for (let y = 5; y <= 10; y++) for (let x = 2; x <= 15; x++) k.set(x, y, (x + y) % 2 ? BASE : LIGHT);
    k.rect(2, 4, 14, 1, HIGH);
    const fr = [['cap_red', 'cap_red', 'petal_orange'], ['petal_purple', 'leaf', 'cap_red'], ['petal_orange', 'gh_corn_kernel', 'leaf']][v % 3];
    fr.forEach((r, i) => a.layer(r).ellipse(5 + i * 4, 3.5, 1.8, 1.6));
    a.layer(HX.wicker, { outline: false, shading: false }).line(3, 4, 8, 0, SHADE).line(8, 0, 14, 4, SHADE);
    return fin(a, 9, 11);
  },
  flantern() {
    const a = new PixelArt(8, 12);
    a.layer('dark', { outline: false, shading: false }).set(3, 0, HIGH).set(4, 0, HIGH).set(3, 1, LIGHT);
    const f = a.layer(HX.frameG);
    f.rect(1, 3, 6, 7, HIGH);
    f.rect(2, 2, 4, 1, LIGHT);
    const g = a.layer('lamp', { outline: false, shading: false, glow: true });
    g.rect(2, 4, 4, 5, BASE);
    g.set(2, 4, HIGH).set(3, 5, HIGH);
    return fin(a, 4, 11, { halo: { dx: 0, dy: -6, r: 20, rgb: [255, 200, 120] } });
  },
  hose(v) {
    const a = new PixelArt(14, 12);
    const ramp = v % 2 ? 'petal_yellow' : 'leaf';
    a.layer(ramp).ellipse(7, 6, 5.5, 4.5);
    const ring = a.layer(ramp, { outline: false, shading: false });
    for (let y = 2; y <= 10; y++) for (let x = 1; x <= 13; x++) {
      const d = Math.hypot((x + 0.5 - 7) / 5.5, (y + 0.5 - 6) / 4.5);
      if (d < 1 && Math.abs(d - 0.7) < 0.09) ring.set(x, y, SHADE);
    }
    ring.ellipse(7, 6, 2, 1.4, OUTLINE);
    a.layer('petal_white').rect(11, 9, 2, 1);
    return fin(a, 7, 11);
  },
  broom() {
    // Reisigbesen, an etwas gelehnt
    const a = new PixelArt(12, 28);
    a.layer('wood', { outline: false, shading: false }).line(9, 0, 5, 18, LIGHT).line(10, 1, 6, 18, SHADE);
    const br = a.layer('gh_pumpkin_beige');
    br.rect(3, 18, 5, 3);
    br.rect(2, 21, 7, 5);
    const st = a.layer('gh_pumpkin_beige', { outline: false, shading: false });
    for (const x of [3, 5, 7]) st.line(x, 21, x - 1 + (x > 5 ? 1 : 0), 25, SHADE);
    a.layer('petal_red', { outline: false, shading: false }).rect(3, 19, 5, 1, BASE);
    return fin(a, 5, 26);
  },
  seedtray(v) {
    // Anzuchtschale mit Keimlingen
    const a = new PixelArt(20, 9);
    const t = a.layer(v % 2 ? 'terracotta' : 'wood', { shading: false });
    t.rect(1, 4, 18, 4, BASE);
    for (let x = 1; x <= 18; x++) t.set(x, 4, LIGHT);
    for (const x of [6, 12]) for (let y = 5; y <= 7; y++) t.set(x, y, SHADE);
    const e = a.layer('gh_earth', { outline: false, shading: false });
    for (let x = 2; x <= 17; x++) e.set(x, 3, x % 3 ? BASE : LIGHT);
    const s = a.layer('leaf', { outline: false, shading: false });
    for (let x = 3; x <= 16; x += 3) s.set(x, 2, LIGHT).set(x - 1, 1, BASE).set(x + 1, 1, HIGH);
    return fin(a, 10, 8);
  },
  bird(v) {
    // Rotkehlchen (Seitenansicht), Anker = Füße
    const a = new PixelArt(9, 8);
    const b = a.layer(HX.robin);
    b.ellipse(4, 3.5, 2.6, 2.2);
    b.rect(5, 1, 2, 2);
    b.set(1, 3).set(0, 2);
    a.layer(v ? 'petal_orange' : 'cap_red', { outline: false, shading: false }).set(5, 3, LIGHT).set(6, 3, BASE).set(5, 4, BASE);
    a.layer('dark', { outline: false, shading: false }).set(6, 1, HIGH).set(8, 2, LIGHT);
    a.layer('dark', { outline: false, shading: false }).set(4, 6, HIGH).set(5, 6, HIGH);
    return fin(a, 4, 6);
  },
  can(v) { return prop('can', v); },
};
// 'can' als Requisit aus props.js (BUILD.can bleibt ungenutzt für Teile mit prop)
delete BUILD.can;

// Pflanzenhandlung – Referenz-Szene (API und Stilregeln: docs/SZENEN.md).
//
// Ein gemütlicher Pflanzenladen als „Puppenhaus“ im Querschnitt: Jeder Abschnitt
// ist ein Zimmer (160×200 Welt-Pixel). Zimmer 0 ist der Laden (Schaufenster,
// Wandregal, Hängeampel, Theke mit Kasse und Glocke). Danach wächst das Haus um
// Zimmer im Wechsel – Leseecke, Werkstatt mit Pflanztisch, Wintergarten,
// Treppenhaus – nach oben (Etagen) und zur Seite (Anbauten). Jedes Zimmer hat
// feste, organisch verteilte Stellplätze auf verschiedenen Höhen (Fensterbank,
// Regalbretter, Hängeampeln, Theke, Pflanzenständer, Bodengruppen, Treppenstufen).
// Über jeder Spalte sitzt ein Dach, unten liegt ein Gehweg mit Laterne.
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, C, Buf, rgbRamp, mix, slab, post, trap, text, textWidth, fin, sprite } from '../scenekit/draw.js';
import { gridSequence } from '../scenekit/engine.js';
import { rng, noise, hashString, pick } from '../scenekit/rng.js';
import { prop, propBox } from '../scenekit/props.js';

// --- Maße (Welt-Pixel, lokal im Zimmer) ---------------------------------------
export const RW = 160, RH = 200;
const CEIL = 6; // Deckenbalken 0..5
const WALL = 112; // Wandfuß = Beginn Boden
const SLAB = 194; // Vorderkante Boden (Querschnitt bis RH)
const ROOF = 40, GROUND = 30;
const PAD = { top: ROOF + 6, left: 30, right: 30, bottom: GROUND };
const GRID = { cw: RW, ch: RH, aspect: 1.25, start: [1, 1] };

// eigene Rampen (Tapeten, Stoffe) – je 5 Töne: outline, shade, base, light, highlight
const R = {
  cream: rgbRamp(['#7a5a40', '#c8a882', '#e6d2b0', '#f0e2c6', '#f8f0de']),
  sage: rgbRamp(['#3e4a3a', '#7d9476', '#a3b897', '#bccbae', '#d6e0c8']),
  rose: rgbRamp(['#5e3a3a', '#b88a84', '#d8b0a6', '#e6c6bc', '#f2dcd4']),
  ochre: rgbRamp(['#5e4420', '#b8904c', '#d8b06a', '#e6c688', '#f2deb0']),
  teal: rgbRamp(['#24403e', '#4f7a72', '#78a098', '#9cbcb2', '#c4dcd2']),
  brick: rgbRamp(['#4a2a22', '#7e4636', '#a45c44', '#c27a5a', '#dca084']),
  roof: rgbRamp(['#3a1e1c', '#6e3428', '#9a4a34', '#c06a48', '#de9468']),
  slate: rgbRamp(['#1e2430', '#36404e', '#4e5a6a', '#6e7c8c', '#98a6b4']),
  plank: C.wood,
  darkwood: rgbRamp(['#2a1a14', '#432a1e', '#5e3c28', '#7a5236', '#966c48']),
};
const RH_ = { // dieselben als Hex für PixelArt-Ebenen
  sage: ['#3e4a3a', '#7d9476', '#a3b897', '#bccbae', '#d6e0c8'],
  rose: ['#5e3a3a', '#b88a84', '#d8b0a6', '#e6c6bc', '#f2dcd4'],
  ochre: ['#5e4420', '#b8904c', '#d8b06a', '#e6c688', '#f2deb0'],
  teal: ['#24403e', '#4f7a72', '#78a098', '#9cbcb2', '#c4dcd2'],
  wicker: ['#5a3c1c', '#9a6a34', '#c8944c', '#e0b46c', '#f2d494'],
  darkwood: ['#2a1a14', '#432a1e', '#5e3c28', '#7a5236', '#966c48'],
  brass: ['#4a3410', '#8a6420', '#c09030', '#e0b850', '#f8e090'],
};

// Tapeten-Themen pro Zimmer
const THEMES = [
  { wall: 'cream', paper: 'sprig', wains: 'sage', rug: ['terracotta', 'cream'] },
  { wall: 'sage', paper: 'stripe', wains: 'wood', rug: ['petal_red', 'cream'] },
  { wall: 'rose', paper: 'dot', wains: 'sage', rug: ['leaf_sage', 'cream'] },
  { wall: 'ochre', paper: 'diamond', wains: 'darkwood', rug: ['petal_blue', 'cream'] },
  { wall: 'teal', paper: 'stripe', wains: 'wood', rug: ['ochre', 'cream'] },
];

// --- Zimmer-Typen: Stellplätze (lokal; z lokal, Engine addiert rect.y) --------
// Wand-z: Hängeampel 4, Fensterbank 8, Regalebenen gestaffelt (Brett liegt vor
// den Pflanzen der Ebene darunter). Boden: z = y.
const SPOTS = {
  laden: [
    ...[24, 44, 64].map((x) => ({ x, y: 92, z: 8, kind: 'sill' })),
    { x: 86, y: 38, z: 4, kind: 'hang' },
    ...[105, 124, 143].map((x) => ({ x, y: 46, z: 15, kind: 'shelf' })),
    ...[105, 124, 143].map((x) => ({ x, y: 78, z: 11, kind: 'shelf' })),
    { x: 140, y: 150, z: 176.2, kind: 'counter' },
    { x: 40, y: 140, z: 156.2, kind: 'stand' },
    { x: 16, y: 138, kind: 'floor' }, { x: 64, y: 160, kind: 'floor' }, { x: 20, y: 172, kind: 'floor' },
    { x: 46, y: 184, kind: 'floor' }, { x: 74, y: 190, kind: 'floor' }, { x: 102, y: 190, kind: 'floor' },
  ],
  nook: [
    { x: 22, y: 44, z: 14, kind: 'shelf' }, { x: 44, y: 72, z: 12, kind: 'shelf' }, { x: 26, y: 100, z: 10, kind: 'shelf' },
    { x: 82, y: 84, z: 8, kind: 'sill' }, { x: 104, y: 84, z: 8, kind: 'sill' },
    { x: 138, y: 36, z: 4, kind: 'hang' },
    { x: 96, y: 146, z: 160.2, kind: 'table' },
    { x: 18, y: 140, kind: 'floor' }, { x: 16, y: 178, kind: 'floor' }, { x: 42, y: 188, kind: 'floor' },
    { x: 70, y: 180, kind: 'floor' }, { x: 122, y: 192, kind: 'floor' }, { x: 146, y: 188, kind: 'floor' },
  ],
  potting: [
    { x: 20, y: 104, z: 122.2, kind: 'bench' }, { x: 42, y: 104, z: 122.2, kind: 'bench' }, { x: 64, y: 104, z: 122.2, kind: 'bench' },
    { x: 26, y: 66, z: 12, kind: 'shelf' }, { x: 54, y: 66, z: 12, kind: 'shelf' },
    { x: 96, y: 36, z: 4, kind: 'hang' },
    { x: 144, y: 116, z: 164.1, kind: 'ladder' }, { x: 128, y: 136, z: 164.2, kind: 'ladder' }, { x: 112, y: 156, z: 164.3, kind: 'ladder' },
    { x: 20, y: 150, kind: 'floor' }, { x: 72, y: 150, kind: 'floor' }, { x: 46, y: 170, kind: 'floor' },
    { x: 22, y: 188, kind: 'floor' }, { x: 84, y: 188, kind: 'floor' }, { x: 148, y: 186, kind: 'floor' },
  ],
  glass: [
    ...[24, 56, 104, 136].map((x) => ({ x, y: 96, z: 8, kind: 'sill' })),
    { x: 30, y: 38, z: 4, kind: 'hang' }, { x: 80, y: 30, z: 4, kind: 'hang' }, { x: 130, y: 38, z: 4, kind: 'hang' },
    { x: 16, y: 140, kind: 'floor' }, { x: 44, y: 152, kind: 'floor' }, { x: 72, y: 134, kind: 'floor' },
    { x: 146, y: 146, kind: 'floor' }, { x: 20, y: 184, kind: 'floor' }, { x: 52, y: 190, kind: 'floor' },
    { x: 90, y: 190, kind: 'floor' }, { x: 146, y: 188, kind: 'floor' },
  ],
  stairs: [
    { x: 38, y: 85, z: 8, kind: 'step' }, { x: 74, y: 58, z: 8, kind: 'step' }, { x: 110, y: 31, z: 8, kind: 'step' },
    { x: 24, y: 150, kind: 'floor' }, { x: 84, y: 140, kind: 'floor' }, { x: 146, y: 140, kind: 'floor' },
    { x: 52, y: 170, kind: 'floor' }, { x: 110, y: 162, kind: 'floor' }, { x: 20, y: 188, kind: 'floor' },
    { x: 80, y: 188, kind: 'floor' }, { x: 116, y: 192, kind: 'floor' }, { x: 144, y: 186, kind: 'floor' },
  ],
};
const ORDER = ['nook', 'potting', 'glass', 'stairs'];

let seq = [];
const cellOf = (i) => {
  if (i >= seq.length) seq = gridSequence(Math.max(i + 1, seq.length * 2, 16), GRID);
  return seq[i];
};

/** Zimmer i: Typ, Spiegelung, Thema – nur von i abhängig. */
export function roomInfo(i) {
  const [c, r] = cellOf(i);
  const rr = rng(`ph:room:${i}`);
  // je vier Zimmer kommen alle Typen einmal vor, in gemischter Reihenfolge
  const block = Math.floor((i - 1) / ORDER.length), br = rng(`ph:block:${block}`);
  const perm = [...ORDER].map((t) => [br(), t]).sort((a, z) => a[0] - z[0]).map((x) => x[1]);
  if (block === 0) perm.sort((a, z) => ORDER.indexOf(a) - ORDER.indexOf(z)); // Start immer: Leseecke, Werkstatt …
  const type = i === 0 ? 'laden' : perm[(i - 1) % ORDER.length];
  const mirror = i === 0 ? false : rr() < 0.5;
  const theme = i === 0 ? 0 : 1 + ((i - 1 + Math.floor((i - 1) / ORDER.length)) % (THEMES.length - 1));
  return { c, r, type, mirror, theme, seed: hashString(`ph:${i}`) };
}

export default {
  id: 'pflanzenhandlung',
  anchor: 'bottom',
  pad: PAD,
  minSections: 1,
  maxFill: 6,

  section(i) {
    const info = roomInfo(i);
    const mx = (x) => (info.mirror ? RW - x : x);
    const spots = SPOTS[info.type].map((s) => ({ ...s, x: mx(s.x), z: s.z ?? s.y }));
    // Zimmer wachsen nach oben (Etagen) und zur Seite
    return { rect: { x: info.c * RW, y: -(info.r + 1) * RH, w: RW, h: RH }, ...info, spots };
  },

  pieces(scene) {
    const out = [];
    for (const s of scene.sections) furnish(s, out, scene);
    return out;
  },

  front(scene) {
    const out = [];
    // Efeu rankt an den Hauskanten und hängt von der Traufe (überlappt leicht)
    const tops = columnTops(scene);
    for (const [c, t] of tops) {
      const rr = rng(`ph:ivy:${c}`);
      const x0 = t.x, x1 = t.x + RW;
      if (rr() < 0.75) out.push({ kind: 'ivy', v: Math.floor(rr() * 3), x: x0 + 1, y: t.y + 2, z: 0, flip: false });
      if (rr() < 0.5) out.push({ kind: 'ivy', v: Math.floor(rr() * 3), x: x1 - 2, y: t.y + 2, z: 0, flip: true });
    }
    return out;
  },

  sprite(p) {
    const b = BUILD[p.kind];
    if (!b) return null;
    return sprite(`ph|${p.kind}|${p.v ?? 0}|${p.len ?? ''}`, () => b(p.v ?? 0, p));
  },

  paint(scene) {
    const { W, H } = scene;
    const b = new Buf(W, H);
    const halos = [], beams = [];
    const groundY = scene.content.y1 - GROUND;
    paintExterior(b, scene, groundY, halos);
    for (const s of scene.sections) {
      const room = paintRoom(s);
      b.queue.push(['room', room, s]);
      for (const h of room.halos) halos.push({ ...h, x: s.rect.x + (s.mirror ? RW - h.x : h.x), y: s.rect.y + h.y });
      for (const bm of room.beams) beams.push({ ...bm, pts: bm.pts.map(([x, y]) => [s.rect.x + (s.mirror ? RW - x : x), s.rect.y + y]) });
      // warmer Raumschein nachts
      halos.push({ x: s.rect.x + RW / 2, y: s.rect.y + 120, r: 92, rgb: [255, 170, 90], a: 0.1 });
    }
    paintRoofs(b, scene, halos);
    const res = finishWithRooms(b);
    // Innenräume werden nachts warm gegradet (Lampenlicht), draußen bleibt es blau
    const indoor = scene.sections.map((s) => ({ x: s.rect.x, y: s.rect.y, w: RW, h: RH }));
    return { ...res, halos, beams, indoor, sky: true, skySeed: 11, outside: [70, 52, 40] };
  },
};

// --- Hilfen ------------------------------------------------------------------

function columnTops(scene) {
  const tops = new Map();
  for (const s of scene.sections) {
    const t = tops.get(s.c);
    if (!t || s.rect.y < t.y) tops.set(s.c, { x: s.rect.x, y: s.rect.y });
  }
  return tops;
}

/** Buf.finish mit Zimmer-Bildern (gespiegelt eingesetzt). */
function finishWithRooms(b) {
  const rooms = b.queue.filter((q) => q[0] === 'room');
  b.queue = b.queue.filter((q) => q[0] !== 'room');
  const late = b.queue.filter((q) => q[3] === 'late');
  b.queue = b.queue.filter((q) => q[3] !== 'late');
  const res = b.finish();
  const ctx = res.canvas.getContext('2d'), g = res.glow.getContext('2d');
  for (const [, room, s] of rooms) {
    for (const [dst, src] of [[ctx, room.canvas], [g, room.glow]]) {
      if (s.mirror) {
        dst.save();
        dst.translate(s.rect.x + RW, s.rect.y);
        dst.scale(-1, 1);
        dst.drawImage(src, 0, 0);
        dst.restore();
      } else dst.drawImage(src, s.rect.x, s.rect.y);
    }
  }
  for (const [art, x, y] of late) {
    if (art instanceof PixelArt) art.drawTo(ctx, x, y, g);
    else if (art?.img) {
      ctx.drawImage(art.img, x - art.ax, y - art.ay);
      if (art.glow) g.drawImage(art.glow, x - art.ax, y - art.ay);
    }
  }
  return res;
}

/** Teil in Zimmer-Koordinaten (lx, ly, lz) → Welt; spiegelt mit dem Zimmer. */
const put = (s, kind, lx, ly, lz, extra = {}) => ({
  ...extra, kind, x: s.rect.x + (s.mirror ? RW - lx : lx), y: s.rect.y + ly, z: s.rect.y + lz, flip: !!extra.flip !== s.mirror,
});
const putProp = (s, name, v, lx, ly, lz, extra = {}) => {
  const p = put(s, undefined, lx, ly, lz, extra);
  delete p.kind;
  return { ...p, prop: name, v };
};

// --- Möbel und Deko pro Zimmer (rein) ---------------------------------------------

/** Deko auf freien Spots, je nach Art. */
const FREE = {
  sill: [0.75, ['candle', 'teacup', 'books', 'sprayer', 'jar', 'candle']],
  shelf: [0.8, ['bookpile', 'jar', 'potstack', 'stand', 'sprayer', 'bookpile', 'candle']],
  counter: [0, []], // Ladenkatze schläft dort
  table: [1, ['teacup', 'candle', 'books']],
  bench: [0.8, ['potstack', 'soilbox', 'sprayer', 'can', 'jar']],
  ladder: [0.6, ['potstack', 'jar', 'can', 'books']],
  step: [0.7, ['potstack', 'candle', 'books', 'can']],
  stand: [1, ['potstack', 'jar']],
  floor: [0.7, ['can', 'sack', 'crate', 'potstack', 'stool', 'soilbox', 'books', 'can', 'crate']],
};

function furnish(s, out, scene) {
  const L = SPOTS[s.type];
  const P = (kind, lx, ly, lz, extra) => out.push(put(s, kind, lx, ly, lz, extra));
  const free = new Set(scene.free.filter((f) => f.section === s.index).map((f) => f.key));
  let cat = false;
  // Deko auf freien Spots (verschwindet, sobald dort eine Pflanze wächst)
  s.spots.forEach((sp, n) => {
    const kind = sp.kind;
    const local = L[n];
    if (kind === 'hang') {
      if (!free.has(sp.key)) {
        // Makramee-Ampel: Schnüre von der Decke zum Topf (hinter der Pflanze)
        out.push({ kind: 'hanger', len: local.y - 8 - CEIL, x: sp.x, y: s.rect.y + CEIL, z: sp.z - 0.05, flip: false });
      } else if (rng(`ph:hang:${sp.key}`)() < 0.85) out.push({ prop: 'basket', v: s.index % 2, x: sp.x, y: s.rect.y + CEIL, z: sp.z, spot: sp.key });
      return;
    }
    if (!free.has(sp.key)) return;
    const [p, list] = FREE[kind] || FREE.floor;
    const r2 = rng(`ph:free:${sp.key}`);
    if (r2() > p) return;
    let name = pick(r2, list);
    if (kind === 'floor' && !cat && r2() < 0.25) { name = 'catsit'; cat = true; }
    if (kind === 'sill' && !cat && r2() < 0.2) { name = 'cat'; cat = true; }
    const v = Math.floor(r2() * 3);
    const dx = kind === 'floor' ? Math.round((r2() - 0.5) * 6) : 0;
    const x = sp.x + dx, y = sp.y;
    out.push({ prop: name, v, x, y, z: sp.z, flip: r2() < 0.5, spot: sp.key, yield: kind === 'floor', box: propBox(name, x, y) });
  });

  if (s.type === 'laden') {
    P('board', 124, 78, 10, { v: 0 });
    P('board', 124, 46, 14, { v: 1 });
    P('counter', 128, 176, 176);
    P('register', 112, 150, 176.1);
    P('bell', 125, 150, 176.1);
    P('pstand', 40, 156, 156, { v: 0 });
    P('bench2', 30, 124, 124);
    // Obstkiste und Topfstapel hinten im Laden (weichen Pflanzen aus)
    for (const [name, v, lx, ly] of [['crate', 2, 92, 130], ['potstack', 0, 104, 132], ['can', 2, 154 - 6, 192]]) {
      const q = putProp(s, name, v, lx, ly, ly);
      out.push({ ...q, yield: true, box: propBox(name, q.x, q.y) });
    }
    // Ladenkatze schläft auf der Theke, wenn sie frei ist
    out.push({ ...putProp(s, 'cat', 1, 140, 150, 176.15), spot: `${s.index}.10` });
  } else if (s.type === 'nook') {
    for (const [y, z, v] of [[100, 9, 0], [72, 11, 1], [44, 13, 2]]) P('bookboard', 33, y, z, { v });
    P('lamp', 148, 166, 166);
    P('armchair', 124, 168, 168, { v: (s.theme + 1) % 3, flip: false });
    out.push(putProp(s, 'cat', (s.index + 2) % 3, 121, 157, 168.1));
    P('sidetable', 96, 160, 160);
  } else if (s.type === 'potting') {
    P('bench', 43, 122, 122);
    P('wallboard', 40, 66, 11);
    P('ladder', 128, 164, 164);
    const sk = putProp(s, 'sack', 1, 132, 192, 192);
    out.push({ ...sk, yield: true, box: propBox('sack', sk.x, sk.y) });
  } else if (s.type === 'glass') {
    P('wicker', 118, 166, 166, { flip: false });
    P('roundtable', 92, 170, 170);
    out.push(putProp(s, 'teacup', 1, 92, 161, 170.1));
  } else if (s.type === 'stairs') {
    P('bench2', 44, 128, 128);
    out.push(putProp(s, 'catsit', 0, 34, 120, 128.1));
  }
}

// --- Hintergrund: Außen ---------------------------------------------------------

function paintExterior(b, scene, groundY, halos) {
  const { W, H } = scene;
  const seed = 97;
  paintBackdrop(b, scene, groundY, halos);
  // Boden: Gras, dann Gehweg aus Pflaster vor dem Haus
  for (let y = groundY; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = y - groundY;
      let col;
      if (k < 4) col = noise(x >> 1, y, seed) > 0.5 ? C.leaf[2] : C.leaf[1];
      else if (k === 4) col = C.stone[1];
      else {
        // Pflastersteine, versetzt
        const row = Math.floor((k - 5) / 5), off = row % 2 ? 4 : 0;
        const edge = (k - 5) % 5 === 4 || (x + off) % 8 === 0;
        const n = noise(Math.floor((x + off) / 8), row, seed + 3);
        col = edge ? C.stone[1] : n > 0.66 ? C.stone[3] : n > 0.33 ? C.stone[2] : mix(C.stone[2], C.wood[2], 0.25);
      }
      b.set(x, y, col);
    }
  // Grasbüschel am Haus
  for (let x = 0; x < W; x += 3) if (noise(x, 3, seed) > 0.45) { b.set(x, groundY - 1, C.leaf[3]); if (noise(x, 4, seed) > 0.7) b.set(x, groundY - 2, C.leaf[4]); }
  // Sockel unter dem Haus (Steinstufe)
  const cols = columnTops(scene);
  for (const [, t] of cols) {
    for (let x = t.x - 2; x < t.x + RW + 2; x++) {
      b.set(x, groundY, C.stone[0]);
      b.set(x, groundY + 1, C.stone[3]);
      b.set(x, groundY + 2, C.stone[2]);
      b.set(x, groundY + 3, C.stone[1]);
    }
  }
  // Laterne links, Bank/Kübel rechts (wenn Platz)
  const x0 = scene.content.x0 + PAD.left, x1 = scene.content.x1 - PAD.right;
  const lx = x0 - 14;
  if (lx > 3) {
    b.art(streetLamp(), lx - 4, groundY + 6 - 52, 'late');
    halos.push({ x: lx + 1, y: groundY - 40, r: 30, rgb: [255, 200, 120], a: 0.34 });
  }
  if (x1 + 22 < W) {
    b.art(prop('can', 1), x1 + 10, groundY + 10, 'late');
    b.art(planterBox(), x1 + 4, groundY - 8, 'late');
  }
  if (x0 - 34 > 0) b.art(bush(0), x0 - 34, groundY - 12, 'late');
  if (x1 + 36 < W) b.art(bush(1), x1 + 24, groundY - 14, 'late');
}

/** Kulisse hinter dem Haus: ferne Hügel, Bäume, kleine Häuser mit Licht im Fenster. */
function paintBackdrop(b, scene, groundY, halos) {
  const { W } = scene;
  // Inhaltskoordinaten, damit die Kulisse beim Auffüllen nicht springt
  const cx0 = scene.ox;
  const far = rgbRamp(['#3c5a5a', '#5e8078', '#7c9c8c', '#98b4a0', '#b4ccb4']);
  const near = rgbRamp(['#2e4a32', '#4a6e44', '#628a52', '#7ca462', '#9cc078']);
  const hill = (x, a, f, p) => Math.round(Math.sin((x - cx0) / f + p) * a + Math.sin((x - cx0) / (f * 0.43) + p * 2) * a * 0.35);
  for (let x = 0; x < W; x++) {
    const t1 = groundY - 58 + hill(x, 9, 38, 1.3);
    for (let y = t1; y < groundY; y++) b.set(x, y, y === t1 ? far[3] : noise(x >> 1, y >> 1, 41) > 0.8 ? far[1] : far[2]);
    const t2 = groundY - 30 + hill(x, 7, 26, 4.1);
    for (let y = t2; y < groundY; y++) b.set(x, y, y === t2 ? near[3] : y === t2 + 1 ? near[2] : noise(x >> 1, y >> 1, 43) > 0.75 ? near[1] : near[2]);
  }
  // kleine Häuser und Bäume auf den Hügeln (in Inhaltskoordinaten verteilt)
  const step = 34;
  for (let k = Math.floor(-cx0 / step) - 1; k * step + cx0 < W + step; k++) {
    const rr = rng(`ph:backdrop:${k}`);
    const x = k * step + cx0 + Math.floor(rr() * 20);
    const base = groundY - 30 + hill(x, 7, 26, 4.1) + 2;
    const kind = rr();
    if (kind < 0.3) {
      // Häuschen
      const w = 10 + Math.floor(rr() * 5), h = 7 + Math.floor(rr() * 3);
      b.rect(x, base - h, w, h + 2, rr() < 0.5 ? R.cream[1] : R.rose[1]);
      for (let j = 0; j < 5; j++) b.hline(x - 1 + j, x + w - j, base - h - 1 - j, R.roof[j === 0 ? 0 : 1]);
      const wx = x + 2 + Math.floor(rr() * (w - 5)), wy = base - h + 2;
      b.glow(wx, wy, C.lamp[2]); b.glow(wx + 1, wy, C.lamp[2]); b.glow(wx, wy + 1, C.lamp[1]); b.glow(wx + 1, wy + 1, C.lamp[1]);
      halos.push({ x: wx + 1, y: wy + 1, r: 6, rgb: [255, 200, 120], a: 0.3 });
    } else if (kind < 0.85) {
      // runder Baum
      const r = 5 + Math.floor(rr() * 4), ty = base - 4 - r;
      b.rect(x, ty + r, 2, 6, C.wood[1]);
      b.ellipse(x + 1, ty, r, r * 0.9, near[0]);
      b.ellipse(x + 1, ty, r - 1, r * 0.9 - 1, near[2]);
      b.ellipse(x - 1, ty - 2, r * 0.5, r * 0.4, near[3]);
    }
  }
}

function paintRoofs(b, scene, halos) {
  const tops = columnTops(scene);
  const list = [...tops.entries()].sort((a, z) => a[0] - z[0]);
  for (const [c, t] of list) {
    const x0 = t.x - 6, x1 = t.x + RW + 5, yb = t.y - 1; // Traufe
    const h = ROOF - 6;
    const roofRamp = c % 2 ? R.slate : R.roof;
    for (let y = 0; y < h; y++) {
      const yy = yb - y;
      const inset = Math.round(y * 1.15);
      const xa = x0 + inset, xz = x1 - inset;
      if (xa > xz) break;
      for (let x = xa; x <= xz; x++) {
        const row = Math.floor(y / 4), off = row % 2 ? 3 : 0;
        let col = roofRamp[2];
        if (y % 4 === 0) col = roofRamp[1];
        else if ((x + off) % 6 === 0) col = roofRamp[1];
        else if (y % 4 === 3) col = roofRamp[3];
        if (x === xa || x === xz) col = roofRamp[0];
        b.set(x, yy, col);
      }
    }
    // Traufbrett
    b.hline(x0 - 1, x1 + 1, yb + 1, C.wood[0]);
    b.hline(x0, x1, yb, C.wood[3]);
    // First
    const ty = yb - h;
    b.hline(x0 + Math.round(h * 1.15) - 1, x1 - Math.round(h * 1.15) + 1, ty, roofRamp[0]);
    // Gaube mit rundem Fenster (leuchtet nachts)
    const cx = t.x + RW / 2 + (c % 2 ? 14 : -10), cy = yb - 21;
    b.rect(cx - 9, cy - 9, 19, 14, R.cream[2]);
    for (let x = cx - 11; x <= cx + 11; x++) { const k = Math.abs(x - cx); b.set(x, cy - 10 + Math.floor(k / 2), roofRamp[0]); b.set(x, cy - 9 + Math.floor(k / 2), roofRamp[3]); }
    b.rect(cx - 9, cy + 5, 19, 1, C.wood[0]);
    b.vline(cx - 10, cy - 7, cy + 4, R.cream[0]);
    b.vline(cx + 10, cy - 7, cy + 4, R.cream[0]);
    b.ellipse(cx + 0.5, cy - 0.5, 4.6, 4.6, C.wood[0]);
    b.ellipse(cx + 0.5, cy - 0.5, 3.6, 3.6, C.lamp[2]);
    for (let y = cy - 4; y <= cy + 3; y++) for (let x = cx - 4; x <= cx + 4; x++) {
      const d = (x + 0.5 - cx - 0.5) ** 2 + (y + 0.5 - cy + 0.5) ** 2;
      if (d <= 13) b.glow(x, y, y < cy - 1 ? C.lamp[3] : C.lamp[2]);
    }
    b.vline(cx, cy - 4, cy + 3, C.wood[1]);
    b.hline(cx - 4, cx + 4, cy, C.wood[1]);
    halos.push({ x: cx + 0.5, y: cy, r: 16, rgb: [255, 196, 110] });
    // Schornstein (erste Spalte)
    if (c === list[0][0]) {
      const sx = t.x + RW - 40, sy = ty + 6;
      for (let y = sy - 10; y < yb - 14; y++) for (let x = sx; x < sx + 10; x++) {
        const row = y - sy, off = Math.floor(row / 3) % 2 ? 2 : 0;
        b.set(x, y, x === sx ? R.brick[0] : x === sx + 9 ? R.brick[1] : row % 3 === 2 || (x + off) % 5 === 0 ? R.brick[1] : R.brick[2]);
      }
      b.rect(sx - 1, sy - 12, 12, 2, C.stone[2]);
      b.hline(sx - 1, sx + 10, sy - 12, C.stone[3]);
      b.hline(sx - 1, sx + 10, sy - 11, C.stone[1]);
      // Rauchwölkchen
      for (const [dx, dy, r] of [[4, -16, 2.2], [7, -21, 2.8], [3, -27, 3.2], [8, -33, 2.6]]) b.ellipse(sx + dx, sy + dy, r, r * 0.8, [236, 232, 226], 150);
    }
  }
  // Ladenschild auf dem Dach über der Traufe der ersten Spalte
  const t0 = tops.get(scene.sections[0].c);
  b.art(shopSign(), t0.x + RW / 2, t0.y - 14, 'late');
}

// --- Hintergrund: Zimmer ----------------------------------------------------------

function paintRoom(s) {
  const b = new Buf(RW, RH);
  const th = THEMES[s.theme];
  const room = { halos: [], beams: [] };
  const rr = rng(`ph:paint:${s.index}`);
  paintWall(b, th, s.seed, s.type === 'glass');
  paintFloor(b, s.type === 'glass' ? 'tiles' : s.type === 'potting' ? 'boards' : 'planks', s.seed);
  // Teppich
  if (s.type !== 'potting') rug(b, s.type === 'nook' ? 112 : s.type === 'stairs' ? 96 : 74, s.type === 'nook' ? 176 : 168, s.type === 'glass' ? 40 : 34, 13, th.rug, s.seed);
  else rug(b, 70, 176, 24, 10, ['leaf_sage', 'cream'], s.seed); // Fußmatte
  ROOMS[s.type](b, s, room, rr);
  // Lichterkette unter der Decke
  fairyLights(b, 6, RW - 7, CEIL + 1, s.seed, room);
  // Rahmen: Deckenbalken, Seitenwände (Ziegel), Boden-Querschnitt
  frame(b);
  const res = b.finish();
  return { ...res, ...room };
}

function paintWall(b, th, seed, glass) {
  const w = R[th.wall];
  for (let y = CEIL; y < WALL; y++)
    for (let x = 0; x < RW; x++) {
      let col = w[2];
      if (th.paper === 'stripe') col = x % 10 < 4 ? w[3] : w[2];
      else if (th.paper === 'dot') col = (x + (Math.floor(y / 8) % 2) * 4) % 8 === 0 && y % 8 === 3 ? w[4] : w[2];
      else if (th.paper === 'diamond') col = (x + y) % 12 === 0 || (x - y + 1200) % 12 === 0 ? w[3] : w[2];
      else if (th.paper === 'sprig') {
        const cx = (x + (Math.floor(y / 10) % 2) * 6) % 12, cy = y % 10;
        col = (cx === 5 && cy >= 3 && cy <= 5) ? w[1] : (cx === 4 || cx === 6) && cy === 4 ? C.leaf_sage[3] : w[2];
      }
      if (noise(x, y, seed) > 0.96) col = w[3];
      b.set(x, y, col);
    }
  // Schatten unter der Decke
  b.hline(0, RW - 1, CEIL, w[1]);
  // Vertäfelung unten
  const top = WALL - 22;
  const wr = th.wains === 'wood' ? C.wood : R[th.wains] || C.wood;
  for (let y = top; y < WALL; y++)
    for (let x = 0; x < RW; x++) {
      const k = x % 16;
      let col = wr[2];
      if (k === 0) col = wr[1];
      else if (k === 1) col = wr[3];
      else if (y > top + 3 && y < WALL - 6 && (k === 3 || k === 14)) col = k === 3 ? wr[1] : wr[3];
      else if (noise(x, y >> 2, seed + 9) > 0.86) col = wr[3];
      b.set(x, y, col);
    }
  b.hline(0, RW - 1, top - 2, wr[3]);
  b.hline(0, RW - 1, top - 1, wr[4]);
  b.hline(0, RW - 1, top, wr[0]);
  // Fußleiste
  b.rect(0, WALL - 4, RW, 3, C.wood[2]);
  b.hline(0, RW - 1, WALL - 4, C.wood[3]);
  b.hline(0, RW - 1, WALL - 1, C.wood[0]);
  void glass;
}

function paintFloor(b, kind, seed) {
  for (let y = WALL; y < SLAB; y++)
    for (let x = 0; x < RW; x++) {
      let col;
      if (kind === 'tiles') {
        const tx = Math.floor(x / 10), ty = Math.floor((y - WALL) / 8);
        const dark = (tx + ty) % 2;
        col = dark ? mix(C.terracotta[3], C.gh_pumpkin_beige[2], 0.45) : C.gh_pumpkin_beige[3];
        if ((x % 10 === 9) || ((y - WALL) % 8 === 7)) col = C.gh_pumpkin_beige[1];
        else if (noise(x, y, seed) > 0.9) col = dark ? C.terracotta[3] : C.gh_pumpkin_beige[4];
      } else {
        const ph = kind === 'boards' ? 8 : 6;
        const ramp = kind === 'boards' ? R.darkwood : C.wood;
        const row = Math.floor((y - WALL) / ph);
        const off = (row * 37) % 53;
        const n = noise(x >> 3, y, seed + row);
        const base = row % 4 === 1 ? mix(ramp[2], ramp[3], 0.5) : row % 4 === 3 ? mix(ramp[2], ramp[1], 0.25) : ramp[2];
        col = n > 0.88 ? mix(base, ramp[1], 0.35) : n < 0.08 ? mix(base, ramp[3], 0.5) : base;
        if ((y - WALL) % ph === ph - 1) col = mix(ramp[1], ramp[2], 0.3);
        if ((x + off) % 53 === 0) col = mix(ramp[1], ramp[2], 0.3);
      }
      b.set(x, y, col);
    }
  // weicher Schatten an der Wand
  for (let x = 0; x < RW; x++) { b.set(x, WALL, C.dark[2], 120); b.set(x, WALL + 1, C.dark[3], 60); }
}

function rug(b, cx, cy, rx, ry, [outer, inner], seed) {
  const o = R[outer] || C[outer], n = R[inner] || C[inner];
  b.ellipse(cx, cy, rx + 1, ry + 1, o[0]);
  b.ellipse(cx, cy, rx, ry, o[2]);
  b.ellipse(cx, cy, rx - 4, ry - 2.5, n[3]);
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x + 0.5 - cx) / (rx - 4)) ** 2 + ((y + 0.5 - cy) / (ry - 2.5)) ** 2;
      if (d <= 1 && d > 0.55 && (x + y) % 4 === 0) b.set(x, y, o[3]);
      if (d <= 0.18) b.set(x, y, (x + y) % 2 ? o[3] : n[4]);
    }
  // Fransen
  for (let x = Math.floor(cx - rx + 4); x <= cx + rx - 4; x += 2) { b.set(x, Math.round(cy - ry - 2), n[1]); }
  void seed;
}

function fairyLights(b, x0, x1, y, seed, room) {
  const span = 26;
  const cols = [[255, 210, 122], [255, 176, 160], [190, 232, 255], [200, 255, 170]];
  for (let x = x0; x <= x1; x++) {
    const t = ((x - x0) % span) / span;
    const yy = y + Math.round(Math.sin(t * Math.PI) * 3);
    b.set(x, yy, C.dark[3]);
    if ((x - x0) % 5 === 2) {
      const c = cols[((x - x0) / 5 | 0) % cols.length];
      b.set(x, yy + 1, mix(c, [120, 90, 60], 0.35));
      b.glow(x, yy + 1, c, false);
      if ((x - x0) % 20 === 2) room.halos.push({ x, y: yy + 1, r: 9, rgb: c, a: 0.32 });
    }
  }
  void seed;
}

function frame(b) {
  // Deckenbalken (Boden der Etage darüber)
  for (let y = 0; y < CEIL; y++) for (let x = 0; x < RW; x++) b.set(x, y, y === 0 ? R.darkwood[0] : y === CEIL - 1 ? R.darkwood[0] : y === 1 ? R.darkwood[3] : R.darkwood[2]);
  for (let x = 8; x < RW; x += 24) for (let y = 1; y < CEIL - 1; y++) b.set(x, y, R.darkwood[1]);
  // Boden-Querschnitt (Puppenhaus-Kante)
  for (let y = SLAB; y < RH; y++) for (let x = 0; x < RW; x++) {
    let col = R.darkwood[2];
    if (y === SLAB) col = C.wood[4];
    else if (y === SLAB + 1) col = C.wood[3];
    else if (y === RH - 1) col = R.darkwood[0];
    else if ((x + (y > SLAB + 3 ? 6 : 0)) % 12 === 0) col = R.darkwood[1];
    b.set(x, y, col);
  }
  // Seitenwände: Ziegel im Querschnitt
  for (const x0 of [0, RW - 4])
    for (let y = 0; y < RH; y++) for (let x = x0; x < x0 + 4; x++) {
      const row = Math.floor(y / 3), off = row % 2 ? 2 : 0;
      let col = (y % 3 === 2 || (x + off) % 4 === 0) ? R.brick[1] : R.brick[2];
      if (x === x0) col = R.brick[0];
      if (x === x0 + 3) col = R.brick[0];
      b.set(x, y, col);
    }
}

/** Fenster mit Löchern für den Himmel. style: 'shop' | 'round' | 'small' */
function windowAt(b, x, y, w, h, opts = {}) {
  const fr = opts.paint ? R.cream : C.wood;
  b.rect(x - 3, y - 3, w + 6, h + 6, fr[0]);
  b.rect(x - 2, y - 2, w + 4, h + 4, fr[3]);
  b.hline(x - 2, x + w + 1, y - 2, fr[4]);
  b.rect(x - 1, y - 1, w + 2, h + 2, fr[1]);
  b.clear(x, y, w, h);
  // Spiegelung im Glas
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j) % 11 === 0 && i < w / 2) b.set(x + i, y + j, [255, 255, 255], 46);
  // Sprossen
  const bars = opts.bars ?? [Math.floor(w / 2)];
  for (const bx of bars) b.vline(x + bx, y, y + h - 1, fr[2]);
  for (const by of opts.hbars ?? [Math.floor(h / 2)]) b.hline(x, x + w - 1, y + by, fr[2]);
}

function sill(b, x0, x1, sy) {
  // Oberfläche sy-2..sy, Kante sy+1..sy+3, Schatten darunter
  for (let x = x0; x <= x1; x++) {
    b.set(x, sy - 3, C.wood[0]);
    b.set(x, sy - 2, C.wood[2]);
    b.set(x, sy - 1, C.wood[3]);
    b.set(x, sy, C.wood[3]);
    b.set(x, sy + 1, C.wood[4]);
    b.set(x, sy + 2, C.wood[2]);
    b.set(x, sy + 3, C.wood[0]);
    b.set(x, sy + 4, C.dark[3], 70);
  }
  for (let y = sy - 3; y <= sy + 3; y++) { b.set(x0, y, C.wood[0]); b.set(x1, y, C.wood[0]); }
}

function curtain(b, x, y, h, ramp, left) {
  for (let j = 0; j < h; j++) {
    const w = 5 - Math.round(Math.sin((j / h) * Math.PI) * 2) - (j > h * 0.55 ? 1 : 0);
    for (let i = 0; i < w; i++) {
      const xx = left ? x + i : x - i;
      b.set(xx, y + j, i === w - 1 ? ramp[0] : (i + j) % 3 === 0 ? ramp[1] : i === 0 ? ramp[3] : ramp[2]);
    }
  }
  // Raffband
  const ty = y + Math.round(h * 0.55);
  for (let i = 0; i < 4; i++) b.set(left ? x + i : x - i, ty, C.petal_yellow[2]);
}

function sconce(b, x, y, room) {
  b.rect(x - 1, y + 3, 3, 3, rgbRamp(RH_.brass)[1]);
  b.set(x, y + 6, C.dark[2]);
  for (let i = -2; i <= 2; i++) b.glow(x + i, y + 1, C.lamp[2]);
  for (let i = -1; i <= 1; i++) { b.glow(x + i, y, C.lamp[3]); b.glow(x + i, y + 2, C.lamp[1]); }
  b.hline(x - 3, x + 3, y - 1, C.petal_white[1]);
  room.halos.push({ x: x + 0.5, y: y + 1, r: 22, rgb: [255, 196, 120], a: 0.36 });
}

const ROOMS = {
  laden(b, s, room) {
    // Schaufenster mit Gardinen, OFFEN-Schild, Fensterbank
    windowAt(b, 12, 18, 64, 66, { bars: [21, 42], hbars: [24] });
    curtain(b, 10, 16, 40, R.rose, true);
    curtain(b, 78, 16, 40, R.rose, false);
    b.hline(8, 80, 15, C.wood[1]);
    b.hline(8, 80, 14, C.wood[3]);
    b.art(sign('OFFEN'), 44 - Math.floor((textWidth('OFFEN') + 6) / 2), 28);
    sill(b, 8, 80, 92);
    // Sonnenstrahlen durchs Schaufenster
    room.beams.push({ pts: [[14, 20], [74, 20], [128, 186], [50, 186]], rgb: [255, 236, 190], a: 0.12, when: 'day' });
    // Wandregal-Rückwand (Schattenkante) und Konsolen
    for (const yb of [46, 78]) for (let x = 92; x <= 156; x++) b.set(x, yb + 4, C.dark[3], 60);
    for (const yb of [46, 78]) for (const bx of [96, 150]) { b.vline(bx, yb + 2, yb + 9, C.wood[0]); b.line(bx, yb + 9, bx + (bx < 120 ? 5 : -5), yb + 3, C.wood[1]); }
    // Wandleuchte zwischen Fenster und Regal
    sconce(b, 86, 62, room);
    // Bilderrahmen
    b.art(prop('frame', 1), 86, 92 - 6);
    // Kreidetafel mit Preisen am Thekenende (Wand)
    chalkboard(b, 120, 92);
  },
  nook(b, s, room) {
    // Bücherregal (Rückwand mit Büchern), Bretter kommen als Teile
    const x0 = 8, x1 = 58;
    for (let y = 16; y < WALL; y++) for (let x = x0; x <= x1; x++) b.set(x, y, x === x0 || x === x1 ? R.darkwood[0] : (x - x0) % 12 === 11 ? R.darkwood[1] : R.darkwood[2]);
    b.rect(x0 - 1, 14, x1 - x0 + 3, 3, C.wood[2]);
    b.hline(x0 - 1, x1 + 1, 14, C.wood[3]);
    const bookCols = [C.petal_red, C.leaf_deep, C.petal_blue, R.ochre, C.cream, C.terracotta, C.petal_purple, C.leaf_sage];
    const rr = rng(`ph:books:${s.index}`);
    for (const [yb, skip] of [[44, [16, 30]], [72, [38, 52]], [100, [18, 34]]]) {
      let x = x0 + 2;
      while (x < x1 - 2) {
        const w = 2 + Math.floor(rr() * 2), h = 8 + Math.floor(rr() * 6);
        if (x + w >= skip[0] && x <= skip[1]) { x = skip[1] + 1; continue; }
        const col = bookCols[Math.floor(rr() * bookCols.length)];
        const lean = rr() < 0.1;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i + (lean ? Math.floor(j / 5) - 1 : 0), yb - 3 - j, i === 0 ? col[3] : i === w - 1 ? col[1] : col[2]);
        if (h > 9) b.hline(x, x + w - 1, yb - 3 - h + 3, col[4]);
        x += w + (rr() < 0.15 ? 2 : 0);
      }
    }
    // Fenster mit Fenstersitz
    windowAt(b, 70, 26, 44, 50, { bars: [22], hbars: [20] });
    curtain(b, 68, 24, 34, R.sage, true);
    curtain(b, 116, 24, 34, R.sage, false);
    b.hline(64, 120, 22, C.wood[1]);
    sill(b, 66, 118, 84);
    // Sitzkissen-Bank unter dem Fenster
    b.rect(66, 96, 52, 12, C.wood[2]);
    b.hline(66, 117, 96, C.wood[3]);
    b.rect(68, 92, 48, 5, R.rose[2]);
    b.hline(68, 115, 92, R.rose[3]);
    b.hline(68, 115, 96, R.rose[1]);
    // Uhr und Bilder
    clock(b, 140, 70);
    b.art(prop('frame', 2), 132, 102 - 10);
    b.art(prop('frame', 0), 148, 100 - 10);
    room.beams.push({ pts: [[72, 28], [112, 28], [150, 186], [104, 186]], rgb: [255, 236, 190], a: 0.1, when: 'day' });
  },
  potting(b, s, room) {
    // Lochwand mit Werkzeug
    const x0 = 10, x1 = 74, y0 = 24, y1 = 56;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let col = C.gh_pumpkin_beige[2];
      if (x === x0 || y === y0) col = C.gh_pumpkin_beige[3];
      if (x === x1 || y === y1) col = C.gh_pumpkin_beige[0];
      else if ((x - x0) % 4 === 2 && (y - y0) % 4 === 2) col = C.gh_pumpkin_beige[1];
      b.set(x, y, col);
    }
    b.art(tools(), x0 + 3, y0 + 2);
    // Schaufel- und Rechen-Silhouetten an Haken: in tools()
    // rundes Fenster
    for (let y = 22; y <= 58; y++) for (let x = 108; x <= 144; x++) {
      const d = Math.hypot(x + 0.5 - 126, y + 0.5 - 40);
      if (d <= 18) b.set(x, y, d > 16.5 ? C.wood[0] : d > 15 ? C.wood[3] : C.wood[1]);
    }
    for (let y = 26; y <= 54; y++) for (let x = 112; x <= 140; x++) if (Math.hypot(x + 0.5 - 126, y + 0.5 - 40) <= 14) b.clear(x, y);
    b.vline(126, 26, 54, C.wood[2]);
    b.hline(112, 140, 40, C.wood[2]);
    room.beams.push({ pts: [[114, 30], [138, 30], [156, 186], [120, 186]], rgb: [255, 236, 190], a: 0.09, when: 'day' });
    // Saatgut-Schubladen an der Wand (rechts unten)
    seedDrawers(b, 106, 70);
    sconce(b, 86, 60, room);
  },
  glass(b, s, room) {
    // Glaswand mit Sprossen (weiß lackiert), Kniestock aus Ziegeln
    const gy0 = 9, gy1 = 92;
    b.clear(5, gy0, RW - 10, gy1 - gy0);
    for (let y = gy0; y < gy1; y++) for (let x = 5; x < RW - 5; x++) if ((x + y) % 13 === 0 && y > 30) b.set(x, y, [255, 255, 255], 44);
    const fr = R.cream;
    for (let x = 5; x < RW - 5; x += 25) { b.vline(x, gy0, gy1, fr[3]); b.vline(x + 1, gy0, gy1, fr[1]); }
    b.vline(RW - 6, gy0, gy1, fr[1]);
    for (const y of [gy0, 36, 64]) { b.hline(5, RW - 6, y, fr[3]); b.hline(5, RW - 6, y + 1, fr[1]); }
    // Bogenmuster oben
    for (let x = 5; x < RW - 5; x++) { const k = (x - 5) % 25; b.set(x, gy0 + 2 + Math.round(Math.abs(k - 12) / 4), fr[2]); }
    for (let y = gy1; y < WALL; y++) for (let x = 0; x < RW; x++) {
      const row = y - gy1, off = Math.floor(row / 4) % 2 ? 4 : 0;
      b.set(x, y, row % 4 === 3 || (x + off) % 8 === 0 ? R.brick[1] : noise(x, y, s.seed) > 0.85 ? R.brick[3] : R.brick[2]);
    }
    sill(b, 4, RW - 5, 96);
    room.beams.push({ pts: [[10, 12], [150, 12], [160, 190], [40, 190]], rgb: [255, 240, 200], a: 0.08, when: 'day' });
    // Lampions an einer Schnur
    for (const lx of [55, 105]) {
      b.vline(lx, CEIL, CEIL + 8, C.dark[3]);
      for (let j = 0; j < 6; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) < 3 - (j === 0 || j === 5 ? 1 : 0)) b.glow(lx + i, CEIL + 9 + j, j < 2 ? C.lamp[3] : C.lamp[2]);
      room.halos.push({ x: lx + 0.5, y: CEIL + 12, r: 20, rgb: [255, 200, 120], a: 0.34 });
    }
  },
  stairs(b, s, room) {
    // Treppe an der Rückwand, von links unten nach rechts oben durch die Decke
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const sx = 8 + i * 12, top = WALL - 9 * (i + 1);
      // Stufe: Trittfläche + Setzstufe; darunter die Wange
      for (let x = sx; x < sx + 12; x++) {
        b.set(x, top - 2, C.wood[2]);
        b.set(x, top - 1, C.wood[3]);
        b.set(x, top, C.wood[3]);
        b.set(x, top + 1, C.wood[4]);
        for (let y = top + 2; y < top + 9; y++) b.set(x, y, y === top + 2 ? C.wood[1] : C.wood[2]);
        for (let y = top + 9; y < WALL - 4; y++) b.set(x, y, (x + y) % 9 === 0 ? R.darkwood[1] : R.darkwood[2]);
      }
      b.vline(sx, top - 2, top + 8, C.wood[1]);
      // Handlauf-Pfosten an der Wand
      if (i % 2 === 0) b.vline(sx + 6, top - 14, top - 3, C.wood[1]);
    }
    // Handlauf
    b.line(8, WALL - 9 - 14, 8 + 12 * steps, WALL - 9 * (steps + 1) - 14, C.wood[3]);
    b.line(8, WALL - 9 - 13, 8 + 12 * steps, WALL - 9 * (steps + 1) - 13, C.wood[1]);
    // Unter der Treppe: Schrank mit Tür und Herz
    b.rect(14, 80, 40, WALL - 84, R.darkwood[1]);
    b.rect(16, 82, 18, WALL - 88, C.wood[2]);
    b.rect(36, 82, 16, WALL - 88, C.wood[2]);
    b.set(32, 96, C.lamp[2]); b.set(38, 96, C.lamp[2]);
    // Bilder entlang der Treppe
    b.art(prop('frame', 0), 30, 50);
    b.art(prop('frame', 2), 62, 26);
    b.art(prop('stand', 1), 136, 98);
    sconce(b, 100, 70, room);
  },
};

function chalkboard(b, x, y) {
  // kleine Tafel mit Pflanzenkreide, Unterkante y (Wand neben dem Regal unten)
  const x0 = x - 12, y0 = y - 2;
  for (let j = 0; j < 12; j++) for (let i = 0; i < 26; i++) {
    const edge = i === 0 || j === 0 || i === 25 || j === 11;
    b.set(x0 + i, y0 + j, edge ? C.wood[1] : i === 1 || j === 1 ? C.wood[3] : C.dark[2]);
  }
  // Kreide: kleines Blatt-Doodle, Herz und zwei Zeilen
  for (const [i, j] of [[5, 3], [4, 4], [5, 4], [6, 4], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [5, 6], [5, 7], [5, 8]]) b.set(x0 + i, y0 + j, j === 8 || j === 7 ? C.petal_white[2] : C.leaf[3]);
  for (let i = 10; i <= 19; i++) { if (i % 4 !== 1) b.set(x0 + i, y0 + 4, C.petal_white[2]); if (i < 17 && i % 3) b.set(x0 + i, y0 + 7, C.petal_white[1]); }
  for (const [i, j] of [[20, 6], [22, 6], [19, 7], [20, 7], [21, 7], [22, 7], [23, 7], [20, 8], [21, 8], [22, 8], [21, 9]]) b.set(x0 + i, y0 + j, C.petal_pink[3]);
}

function clock(b, cx, cy) {
  b.ellipse(cx + 0.5, cy + 0.5, 7, 7, C.wood[0]);
  b.ellipse(cx + 0.5, cy + 0.5, 6, 6, C.wood[3]);
  b.ellipse(cx + 0.5, cy + 0.5, 5, 5, C.cream[3]);
  b.vline(cx, cy - 3, cy, C.dark[2]);
  b.hline(cx, cx + 2, cy, C.dark[2]);
  for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) b.set(cx + dx, cy + dy, C.wood[1]);
  b.vline(cx, cy + 7, cy + 14, C.lamp[1]);
  b.ellipse(cx + 0.5, cy + 15, 2, 2, C.lamp[2]);
}

function seedDrawers(b, x, y) {
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
    const x0 = x + i * 11, y0 = y + j * 9;
    for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 11; xx++) {
      const edge = xx === 0 || yy === 0;
      b.set(x0 + xx, y0 + yy, edge ? C.wood[0] : yy === 1 ? C.wood[3] : C.wood[2]);
    }
    b.hline(x0 + 4, x0 + 6, y0 + 5, C.lamp[1]);
    b.set(x0 + 3, y0 + 3, [C.petal_red, C.petal_yellow, C.leaf, C.petal_blue][(i + j) % 4][2]);
  }
  b.rect(x, y + 27, 45, 1, C.wood[0]);
}

// --- PixelArt-Teile ------------------------------------------------------------------

function sign(str) {
  const w = textWidth(str) + 6;
  const a = new PixelArt(w + 2, 14);
  a.layer('dark', { outline: false, shading: false }).line(Math.floor(w / 2), 0, 3, 5, HIGH).line(Math.floor(w / 2), 0, w - 2, 5, HIGH);
  a.layer('wood').rect(1, 5, w, 8);
  a.layer('cream', { outline: false, shading: false }).rect(2, 6, w - 2, 6, LIGHT);
  text(a.layer('leaf_deep', { outline: false, shading: false }), 4, 7, str, BASE);
  return a;
}

function shopSign() {
  // Holzschild mit Schriftzug, Anker = Mitte oben
  const str = 'WURZELWERK';
  const w = textWidth(str) + 12;
  const a = new PixelArt(w + 4, 13);
  const bd = a.layer('wood');
  bd.rect(2, 2, w, 9);
  const pl = a.layer('leaf_deep', { outline: false, shading: false });
  pl.rect(3, 3, w - 2, 7, BASE);
  for (let x = 3; x < w + 1; x++) pl.set(x, 3, LIGHT);
  text(a.layer('cream', { outline: false, shading: false }), 8, 4, str, HIGH);
  const lf = a.layer('leaf', { outline: false, shading: false });
  lf.set(4, 6, LIGHT).set(5, 5, HIGH).set(5, 6, BASE).set(4, 7, SHADE);
  lf.set(w - 1, 6, LIGHT).set(w - 2, 5, HIGH).set(w - 2, 6, BASE).set(w - 1, 7, SHADE);
  return { ...a.toCanvas(), ax: Math.floor((w + 4) / 2), ay: 0 };
}

function tools() {
  const a = new PixelArt(60, 30);
  // Schaufel
  a.layer('wood', { outline: false, shading: false }).line(6, 1, 6, 18, LIGHT).line(7, 1, 7, 18, SHADE);
  const bl = a.layer('ph_pot_slate');
  bl.rect(4, 18, 6, 7);
  bl.set(5, 25, BASE).set(6, 26, BASE).set(7, 25, BASE);
  // Rechen
  a.layer('wood', { outline: false, shading: false }).line(16, 1, 16, 20, LIGHT);
  const rk = a.layer('dark');
  rk.rect(12, 21, 9, 1);
  for (let x = 12; x <= 20; x += 2) rk.set(x, 22, LIGHT);
  // Schere
  a.layer('ph_pot_slate', { outline: false, shading: false }).line(26, 3, 30, 11, HIGH).line(30, 3, 26, 11, LIGHT);
  a.layer('petal_red').rect(25, 12, 2, 2).rect(29, 12, 2, 2);
  // Handschuhe
  const gl = a.layer('petal_yellow');
  gl.rect(36, 4, 5, 8).rect(35, 2, 1, 3).rect(37, 1, 1, 3).rect(39, 1, 1, 3);
  // Bindfaden-Rolle
  a.layer('gh_pumpkin_beige').ellipse(50, 6, 3.5, 3.5);
  a.layer('gh_pumpkin_beige', { outline: false, shading: false }).set(50, 6, SHADE).line(53, 7, 55, 14, BASE);
  // kleine Harke
  a.layer('wood', { outline: false, shading: false }).line(46, 14, 46, 22, LIGHT);
  const hk = a.layer('ph_pot_slate');
  hk.rect(44, 22, 5, 1);
  hk.set(44, 23).set(46, 23).set(48, 23);
  return a;
}

function streetLamp() {
  const a = new PixelArt(10, 54);
  const pole = a.layer('dark');
  pole.rect(4, 10, 2, 40);
  pole.rect(2, 48, 6, 4);
  pole.rect(3, 46, 4, 2);
  const head = a.layer('dark');
  head.rect(1, 2, 8, 2);
  head.rect(2, 9, 6, 1);
  head.set(4, 0).set(5, 0).set(4, 1).set(5, 1);
  const g = a.layer('lamp', { outline: false, shading: false, glow: true });
  g.rect(2, 4, 6, 5, BASE);
  g.rect(3, 4, 2, 3, HIGH);
  const fr = a.layer('dark', { outline: false, shading: false });
  for (let y = 4; y <= 8; y++) fr.set(1, y, LIGHT).set(8, y, LIGHT).set(5, y, BASE);
  return a;
}

function planterBox() {
  const a = new PixelArt(20, 12);
  a.layer('wood').rect(1, 5, 18, 6);
  const fl = a.layer('leaf');
  for (const x of [3, 7, 11, 15]) fl.ellipse(x + 0.5, 3.5, 2.2, 2);
  const bl = a.layer('petal_red', { outline: false, shading: false });
  bl.set(4, 2, LIGHT).set(8, 1, BASE).set(12, 2, LIGHT).set(16, 1, BASE);
  return a;
}

function bush(v) {
  const a = new PixelArt(26, 16);
  const l = a.layer(v ? 'leaf' : 'leaf_deep');
  l.ellipse(9, 9, 8, 6).ellipse(17, 8, 8, 7);
  const fl = a.layer(v ? 'petal_pink' : 'petal_white', { outline: false, shading: false });
  for (const [x, y] of [[6, 6], [12, 4], [18, 5], [21, 9], [9, 10], [15, 11]]) fl.set(x, y, LIGHT);
  return a;
}

const BUILD = {
  // Regalbrett mit Konsolen (v: 0 unteres, 1 oberes), Anker = Mitte, Topfboden-Linie
  board() {
    const a = new PixelArt(66, 8);
    slab(a.layer('wood'), 1, 64, 2, 3);
    return fin(a, 33, 2);
  },
  wallboard() {
    const a = new PixelArt(66, 10);
    slab(a.layer('wood'), 1, 64, 2, 3);
    const br = a.layer('wood', { outline: false, shading: false });
    for (const x of [6, 58]) br.line(x, 5, x, 9, SHADE).line(x, 9, x + (x < 30 ? 4 : -4), 5, BASE);
    return fin(a, 33, 2);
  },
  bookboard() {
    const a = new PixelArt(54, 6);
    slab(a.layer(RH_.darkwood), 1, 52, 2, 3);
    return fin(a, 27, 2);
  },
  counter() {
    // Theke: Platte bei y-26 (Topfboden 150), Front bis y; Anker = Mitte unten
    const a = new PixelArt(56, 30);
    const s = 2;
    const body = a.layer('wood');
    for (let y = s + 3; y <= 28; y++) for (let x = 2; x <= 53; x++) body.set(x, y, x === 2 ? LIGHT : x === 53 ? SHADE : (x - 2) % 10 === 0 ? SHADE : BASE);
    const pan = a.layer('wood', { outline: false, shading: false });
    for (let i = 0; i < 5; i++) {
      const x0 = 4 + i * 10;
      for (let y = s + 6; y <= 25; y++) pan.set(x0 + 1, y, SHADE).set(x0 + 8, y, LIGHT);
      for (let x = x0 + 1; x <= x0 + 8; x++) pan.set(x, s + 6, SHADE).set(x, 25, LIGHT);
    }
    // grünes Band mit Blattmuster
    const band = a.layer('leaf_deep', { outline: false, shading: false });
    for (let x = 3; x <= 52; x++) band.set(x, s + 4, BASE).set(x, s + 5, x % 4 === 0 ? LIGHT : SHADE);
    slab(a.layer(RH_.darkwood), 0, 55, s, 2);
    return fin(a, 28, 28);
  },
  register() {
    const a = new PixelArt(16, 14);
    a.layer(RH_.brass).rect(3, 7, 10, 5);
    const k = a.layer('cream');
    k.rect(4, 4, 8, 3);
    const kk = a.layer('cream', { outline: false, shading: false });
    for (let x = 5; x <= 10; x += 2) kk.set(x, 5, SHADE);
    const d = a.layer('dark');
    d.rect(8, 1, 5, 2);
    a.layer('wa_glow', { outline: false, shading: false, glow: true }).rect(9, 1, 3, 1, LIGHT);
    a.layer(RH_.brass, { outline: false, shading: false }).rect(2, 12, 12, 1, SHADE);
    const dr = a.layer(RH_.brass, { outline: false, shading: false });
    for (let x = 4; x <= 11; x++) dr.set(x, 10, SHADE);
    dr.set(7, 9, HIGH).set(8, 9, HIGH);
    return fin(a, 8, 12, { halo: { dx: 2, dy: -11, r: 7, rgb: [120, 240, 210] } });
  },
  bell() {
    const a = new PixelArt(8, 7);
    a.layer('wood').rect(1, 5, 6, 1);
    const d = a.layer(RH_.brass);
    d.ellipse(4, 4, 2.5, 2);
    d.set(4, 1, HIGH);
    return fin(a, 4, 6);
  },
  pstand(v) {
    // Pflanzenständer (Hocker mit Spreizbeinen), Platte 16 px über dem Boden
    const a = new PixelArt(18, 20);
    const legs = a.layer(v ? 'wood' : RH_.darkwood, { outline: false, shading: false });
    legs.line(4, 5, 2, 19, SHADE).line(13, 5, 15, 19, OUTLINE).line(8, 6, 8, 18, BASE).line(3, 14, 14, 14, SHADE);
    legs.set(2, 19, OUTLINE).set(15, 19, OUTLINE);
    slab(a.layer(v ? 'wood' : RH_.darkwood), 2, 15, 3, 2);
    return fin(a, 8, 19);
  },
  hanger(v, p) {
    // Makramee-Schnüre von der Decke bis knapp über den Topfrand
    const len = Math.max(6, p.len || 20);
    const a = new PixelArt(22, len + 2);
    const c = a.layer('gh_pumpkin_beige', { outline: false, shading: false });
    for (let y = 0; y <= len; y++) {
      const t = y / len;
      c.set(11, Math.min(y, 3), LIGHT);
      if (y > 3) {
        c.set(Math.round(11 - t * 8), y, y % 3 ? LIGHT : SHADE);
        c.set(Math.round(11 + t * 8), y, y % 3 ? BASE : SHADE);
      }
    }
    c.rect(10, 3, 3, 2, SHADE);
    for (let x = 4; x <= 18; x += 2) c.set(x, len - 2, HIGH);
    return fin(a, 11, 0);
  },
  armchair(v) {
    const a = new PixelArt(30, 26);
    const ramp = [RH_.sage, RH_.rose, RH_.ochre][v % 3];
    const back = a.layer(ramp);
    back.rect(5, 1, 20, 13);
    back.ellipse(15, 2, 10, 2.5);
    const tuft = a.layer(ramp, { outline: false, shading: false });
    for (const x of [9, 15, 21]) tuft.set(x, 6, SHADE).set(x, 10, SHADE);
    const seat = a.layer(ramp);
    seat.rect(6, 13, 18, 5, LIGHT);
    seat.rect(6, 18, 18, 4, SHADE);
    for (let x = 6; x < 24; x++) seat.set(x, 13, HIGH);
    const arms = a.layer(ramp);
    arms.rect(1, 10, 6, 12);
    arms.rect(23, 10, 6, 12);
    arms.ellipse(4, 10, 3, 1.5).ellipse(26, 10, 3, 1.5);
    const legs = a.layer('wood', { outline: false, shading: false });
    for (const x of [3, 4, 25, 26]) legs.set(x, 23, x % 2 ? SHADE : OUTLINE).set(x, 24, OUTLINE);
    // Decke über der Lehne
    const bl = a.layer('petal_red', { outline: false, shading: false });
    for (let y = 1; y <= 9; y++) bl.set(22, y, y % 2 ? BASE : LIGHT).set(23, y, SHADE);
    for (let x = 18; x <= 23; x++) bl.set(x, 1, LIGHT);
    return fin(a, 15, 24);
  },
  lamp() {
    // Stehlampe mit Stoffschirm (leuchtet), Anker = Fuß
    const a = new PixelArt(16, 66);
    const pole = a.layer(RH_.brass, { outline: false, shading: false });
    for (let y = 12; y <= 62; y++) pole.set(8, y, y % 9 === 0 ? HIGH : BASE);
    const foot = a.layer(RH_.brass);
    foot.ellipse(8, 63, 4.5, 1.5);
    const shade = a.layer('cream');
    trap(shade, 8, 2, 11, 8, 13);
    const sg = a.layer('lamp', { outline: false, shading: false, glow: true });
    for (let x = 4; x <= 12; x++) sg.set(x, 12, BASE);
    sg.rect(6, 4, 5, 6, LIGHT);
    const fringe = a.layer('cream', { outline: false, shading: false });
    for (let x = 2; x <= 14; x += 2) fringe.set(x, 12, SHADE);
    return fin(a, 8, 64, { halo: { dx: 0, dy: -56, r: 34, rgb: [255, 196, 120] } });
  },
  sidetable() {
    // Beistelltisch rund, Platte 14 px hoch
    const a = new PixelArt(22, 18);
    const legs = a.layer('wood', { outline: false, shading: false });
    legs.line(11, 5, 11, 16, BASE).line(10, 5, 10, 16, LIGHT);
    legs.line(6, 17, 15, 17, SHADE);
    const top = a.layer('wood');
    top.ellipse(11, 3, 9, 2.4);
    a.layer('wood', { outline: false, shading: false }).rect(3, 5, 17, 1, SHADE);
    return fin(a, 11, 17);
  },
  bench() {
    // Pflanztisch an der Wand, Platte bei y-18, unten Ablage mit Töpfen/Erde
    const a = new PixelArt(80, 22);
    const legs = a.layer(RH_.darkwood);
    post(legs, 3, 4, 20);
    post(legs, 74, 4, 20);
    const shelf = a.layer('wood');
    for (let x = 4; x <= 76; x++) shelf.set(x, 15, LIGHT).set(x, 16, SHADE);
    const stuff = a.layer('terracotta');
    trap(stuff, 14, 10, 14, 7, 5);
    trap(stuff, 22, 11, 14, 6, 5);
    const sk = a.layer('gh_butternut');
    sk.rect(46, 8, 9, 7);
    a.layer('cream', { outline: false, shading: false }).rect(48, 10, 5, 3, LIGHT);
    a.layer('soil', { outline: false, shading: false }).rect(60, 12, 10, 3, BASE).set(62, 12, LIGHT).set(66, 13, HIGH);
    slab(a.layer('wood'), 0, 79, 2, 3);
    // Erdkrümel auf der Platte
    a.layer('soil', { outline: false, shading: false }).set(30, 0, BASE).set(31, 0, LIGHT).set(52, 0, BASE).set(72, 1, BASE);
    return fin(a, 40, 20);
  },
  ladder() {
    // Treppenregal mit drei Stufen nach hinten rechts; Anker = Mitte unten (x 128 lokal)
    const a = new PixelArt(52, 54);
    const ax = 24, ay = 52; // lokale Mitte
    const steps = [[-16, -8], [0, -28], [16, -48]]; // (dx, Topfboden relativ) – passend zu den Spots
    const rails = a.layer('wood');
    rails.line(ax - 22, ay, ax + 22, ay - 50, LIGHT);
    rails.line(ax - 20, ay, ax + 24, ay - 50, BASE);
    const legs = a.layer('wood', { outline: false, shading: false });
    legs.line(ax + 24, ay - 49, ax + 24, ay, SHADE).line(ax + 25, ay - 49, ax + 25, ay, OUTLINE);
    for (const [dx, dy] of steps) slab(a.layer('wood'), ax + dx - 9, ax + dx + 9, ay + dy, 2);
    return fin(a, ax, ay);
  },
  wicker() {
    // Korbsessel (Pfauenstuhl)
    const a = new PixelArt(30, 34);
    const back = a.layer(RH_.wicker);
    back.ellipse(15, 11, 13, 11);
    const weave = a.layer(RH_.wicker, { outline: false, shading: false });
    for (let y = 2; y <= 20; y++) for (let x = 3; x <= 27; x++) {
      const d = ((x + 0.5 - 15) / 12) ** 2 + ((y + 0.5 - 11) / 10) ** 2;
      if (d < 1 && (x + y) % 3 === 0) weave.set(x, y, d > 0.6 ? SHADE : LIGHT);
    }
    const seat = a.layer(RH_.wicker);
    seat.ellipse(15, 21, 10, 3);
    const cush = a.layer(RH_.teal);
    cush.ellipse(15, 19.5, 8, 2.2);
    const base = a.layer(RH_.wicker);
    trap(base, 15, 24, 31, 8, 14);
    return fin(a, 15, 32);
  },
  roundtable() {
    const a = new PixelArt(20, 12);
    a.layer(RH_.wicker, { outline: false, shading: false }).line(10, 4, 10, 11, BASE).line(6, 11, 14, 11, SHADE);
    a.layer('petal_white').ellipse(10, 2.5, 8, 2);
    return fin(a, 10, 11);
  },
  bench2() {
    // Sitzbank im Treppenhaus mit Kissen
    const a = new PixelArt(34, 16);
    const legs = a.layer('wood', { outline: false, shading: false });
    for (const x of [4, 29]) legs.line(x, 8, x, 15, SHADE).line(x + 1, 8, x + 1, 15, OUTLINE);
    slab(a.layer('wood'), 1, 32, 7, 3);
    a.layer(RH_.rose).ellipse(10, 4.5, 6, 2.5);
    return fin(a, 17, 15);
  },
  ivy(v) {
    // Efeu von der Traufe, Anker = oben links (gespiegelt rechts)
    const len = 22 + v * 9;
    const a = new PixelArt(10, len + 4);
    const st = a.layer('stem', { outline: false, shading: false });
    for (let y = 0; y < len; y++) st.set(2 + Math.round(Math.sin(y / 4) * 1.4), y, SHADE);
    const lv = a.layer(v === 1 ? 'leaf' : 'leaf_deep');
    for (let y = 2; y < len; y += 4) {
      const x = 2 + Math.round(Math.sin(y / 4) * 1.4);
      lv.rect(x + (y % 8 ? 1 : -1), y, 2, 2);
    }
    return fin(a, 2, 0);
  },
};

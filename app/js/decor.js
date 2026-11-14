// Deko für die vier Orte, damit Regionen mit wenigen Pflanzen nicht leer wirken.
//
// Zwei Teile:
//  1. Platzierung (rein, ohne DOM, getestet): decorPieces(layout) liefert Teile
//     { kind: 'deco', part, v, x, y, z, flip } – gleiche Form wie die Möbel aus
//     layout.js, damit garden.js sie z-sortiert zwischen die Pflanzen zeichnet.
//     - Innenräume: Deko steht auf *freien* Stellplätzen (Regal, Tisch, Teppich,
//       Beet …) und verschwindet, sobald dort eine Pflanze wächst. Dazu feste
//       Deko an Wand, Fenster und in den Kieswegen, die nie einen Platz belegt.
//     - Blumenwiese/Wald: Deko in einem festen 32-px-Kachelraster (Zufall aus
//       den Kachelkoordinaten), dadurch stabil, wenn die Fläche wächst. Teile, die
//       eine Pflanze verdecken würden (davor/darunter), werden weggelassen.
//  2. Sprites (decoSprite): Pixel-Art im Stil der Pflanzen/Möbel – Rampen aus
//     palette.js, Outline in der dunkelsten Rampenfarbe, Licht oben links.
//
// Ränder, die nie von Pflanzen abhängen (Zaun, Pfad, Bank, Randbäume), zeichnet
// scenery.js direkt in den Boden (decorArt() unten liefert die Grafiken).
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH } from './pixelart.js';
import { mulberry32, hashString, INDOOR, SHOP } from './layout.js';

const rng = (s) => mulberry32(hashString(s));

// Größe (Breite, Höhe) der Teile in Welt-Pixeln – für Abstandsprüfungen
export const DECO_SIZE = {
  books: [14, 11], sprayer: [9, 13], pot: [12, 10], frame: [12, 12], stand: [10, 10],
  basket: [16, 36], register: [16, 13], bell: [8, 7], soilbox: [14, 11], stool: [12, 12],
  armchair: [22, 20], cat: [16, 9], sign: [26, 13], flowers: [9, 6],
  barrow: [24, 14], sack: [14, 12], toolboard: [26, 18], seedshelf: [24, 24], straw: [18, 12],
  hose: [14, 12], thermo: [5, 14], stake: [5, 9],
  tuft: [11, 10], stone: [11, 7], puff: [9, 12], mossrock: [12, 8], stump: [14, 12], log: [22, 9],
  leaves: [12, 6], puddle: [22, 9], squirrel: [11, 12],
};
// flach am Boden: Pflanzen dürfen davor *und* dahinter stehen, nur nicht darin
const FLAT = new Set(['leaves', 'puddle']);

// --- Platzierung ---------------------------------------------------------------

/** Deko-Teile für ein Layout aus layoutGarden(). Deterministisch. */
export function decorPieces(layout) {
  const r = layout.region;
  if (r === 'pflanzenhandlung') return shopDecor(layout);
  if (r === 'gewaechshaus') return greenhouseDecor(layout);
  return outdoorDecor(layout);
}

const piece = (part, x, y, z, v = 0, flip = false) => ({ kind: 'deco', part, v, x, y, z, flip });

function slotIndex(s) {
  return +s.key.split(',')[2];
}

function shopDecor(layout) {
  const out = [];
  const free = [...(layout.free || [])].sort((a, b) => cmpKey(a.key, b.key));
  const taken = new Set();
  const take = (s, part, v = 0, flip = false, dy = 0) => {
    taken.add(s.key);
    out.push(piece(part, s.x, s.y + dy, s.z, v, flip));
  };
  // Kasse + Glocke auf der Kommode (erste freie, bevorzugt Mitte)
  const side = free.filter((s) => s.on === 'sideboard');
  const reg = side.find((s) => slotIndex(s) === 3) || side[0];
  if (reg) {
    take(reg, 'register');
    const bell = side.find((s) => !taken.has(s.key) && s.key.split(',')[0] === reg.key.split(',')[0]);
    if (bell) take(bell, 'bell');
  }
  // Teppich: Sessel hinten links, Katze vorne (eine pro Laden)
  let cat = false;
  const rugs = free.filter((s) => s.on === 'rug');
  for (const s of rugs) {
    const i = slotIndex(s), cell = s.key.split(',').slice(0, 2).join();
    const rr = rng('ph:rug:' + cell);
    const armchair = rr() < 0.85, rest = rr();
    if (i === 0 && armchair) take(s, 'armchair', rest < 0.5 ? 0 : 1);
    else if (i === 2 && !cat) { take(s, 'cat', rest < 0.6 ? 0 : 1, rest < 0.3); cat = true; }
    else if (i === 1) take(s, rest < 0.5 ? 'stool' : 'soilbox', 0, rest < 0.25);
  }
  // Katze ohne Teppich: schläft auf einer Kiste oder einem Tisch
  if (!cat) {
    const s = free.find((q) => !taken.has(q.key) && q.on === 'crate') || free.find((q) => !taken.has(q.key) && q.on === 'table');
    if (s) take(s, 'cat', 0, false);
  }
  // Kleinkram auf den übrigen freien Plätzen
  const CHOICES = {
    shelf: [0.55, ['books', 'pot', 'sprayer', 'stand', 'books', 'pot']],
    sill: [0.6, ['sprayer', 'pot', 'books']],
    sideboard: [0.6, ['books', 'pot', 'sprayer']],
    table: [0.7, ['can', 'sprayer', 'soilbox', 'books', 'pot']],
    crate: [0.5, ['soilbox', 'pot', 'can']],
  };
  let prev = '';
  for (const s of free) {
    if (taken.has(s.key) || !CHOICES[s.on]) continue;
    const [p, list] = CHOICES[s.on];
    const rr = rng('ph:slot:' + s.key);
    if (rr() > p) { prev = ''; continue; }
    let part = list[Math.floor(rr() * list.length)];
    if (part === prev) part = list[(list.indexOf(part) + 1) % list.length];
    prev = part;
    const flip = rr() < 0.5;
    if (part === 'can') { taken.add(s.key); out.push({ kind: 'can', part: 'body', x: s.x, y: s.y, z: s.z, v: rr() < 0.5 ? 0 : 1, flip }); continue; }
    take(s, part, Math.floor(rr() * 3), flip);
  }
  // Freie Dielen vor der Wand und zwischen den Möbelreihen (nie ein Stellplatz)
  const STRIP = ['soilbox', 'can', 'sack', 'stool', 'soilbox', 'sack'];
  for (const w of layout.walls || []) {
    const rr = rng('ph:strip:' + w.cx);
    if (rr() > 0.65) continue;
    const part = STRIP[Math.floor(rr() * STRIP.length)], x = w.cx + Math.round((rr() - 0.5) * 40), y = SHOP.wallFoot + 12;
    if (part === 'can') out.push({ kind: 'can', part: 'body', x, y, z: y, v: rr() < 0.5 ? 0 : 1, flip: rr() < 0.5 });
    else out.push(piece(part, x, y, y, Math.floor(rr() * 3), rr() < 0.5));
  }
  for (const f of layout.pieces || []) {
    if (f.kind !== 'table' && f.kind !== 'crates') continue;
    const rr = rng(`ph:aisle:${f.x}:${f.y}`);
    if (rr() > 0.4) continue;
    const y = f.y + 6;
    if (y > layout.H - 3) continue;
    const part = STRIP[Math.floor(rr() * STRIP.length)], x = f.x + Math.round((rr() - 0.5) * 44);
    if (part === 'can') out.push({ kind: 'can', part: 'body', x, y, z: y, v: rr() < 0.5 ? 0 : 1, flip: rr() < 0.5 });
    else out.push(piece(part, x, y, y, Math.floor(rr() * 3), rr() < 0.5));
  }
  // Wand: Hängeampel mit Efeutute und Bilderrahmen neben den Fenstern, Schild im ersten Fenster
  const wins = (layout.walls || []).filter((w) => w.kind === 'window');
  wins.forEach((w, k) => {
    const rr = rng('ph:wall:' + w.cx);
    const left = rr() < 0.5;
    const bx = w.cx + (left ? -24 : 24), fx = w.cx + (left ? 24 : -24);
    out.push(piece('basket', bx, 3, 0.4, 0, rr() < 0.5));
    out.push(piece('frame', fx, 30, 0.3, Math.floor(rr() * 3)));
    if (k === 0) out.push(piece('sign', w.cx, 34, 0.5));
  });
  return out;
}

function greenhouseDecor(layout) {
  const d = INDOOR.gewaechshaus;
  const out = [];
  const C = layout.cols || 0, R = layout.rows || 0;
  const cans = (layout.pieces || []).filter((p) => p.kind === 'can');
  for (let c = 0; c < C; c++) {
    const x0 = d.side + c * d.cellW;
    // hinten an der Glaswand
    const rb = rng('gh:back:' + c);
    const t = rb(), bx = x0 + 32 + Math.round((rb() - 0.5) * 14), flip = rb() < 0.5;
    if (t < 0.36) out.push(piece('seedshelf', bx, d.top + 4, d.top + 4, 0, flip));
    else if (t < 0.7) out.push(piece('toolboard', bx, d.top - 4, 0.2, 0));
    else if (t < 0.85) out.push(piece('sack', bx, d.top + 4, d.top + 4, Math.floor(rb() * 2), flip));
    else out.push(piece('straw', bx, d.top + 4, d.top + 4, 0, flip));
    // Kieswege unter den Beeten
    for (let r = 0; r < R; r++) {
      const yT = d.top + r * d.rowH, gy = yT + d.rowH - 2;
      const rr = rng(`gh:path:${c}:${r}`);
      if (rr() > 0.62) continue;
      const kinds = ['barrow', 'sack', 'hose', 'straw', 'sack', 'barrow'];
      const part = kinds[Math.floor(rr() * kinds.length)];
      const w = DECO_SIZE[part][0];
      let x = x0 + 14 + Math.round(rr() * 36);
      const can = cans.find((q) => q.y === gy && q.x > x0 - 8 && q.x < x0 + d.cellW + 8);
      if (can && Math.abs(can.x - x) < w / 2 + 10) x = can.x < x0 + 32 ? Math.min(x0 + 58 - w / 2, can.x + w / 2 + 12) : Math.max(x0 + 6 + w / 2, can.x - w / 2 - 12);
      out.push(piece(part, Math.round(x), gy, gy, Math.floor(rr() * 2), rr() < 0.5));
    }
  }
  // Thermometer an einer Sprosse der Glaswand
  const panes = Math.max(2, Math.round(layout.W / 16));
  out.push(piece('thermo', Math.round((layout.W - 1) / panes), 23, 0.1));
  // Schildchen in freien Beetplätzen
  for (const s of layout.free || []) {
    if (s.on !== 'bed') continue;
    const rr = rng('gh:stake:' + s.key);
    if (rr() < 0.42) out.push(piece('stake', s.x + Math.round((rr() - 0.5) * 4), s.y, s.z, Math.floor(rr() * 3)));
  }
  return out;
}

export const TILE = 32;
const OUT_ITEMS = {
  blumenwiese: [[0.42, 'tuft'], [0.14, 'stone'], [0.18, 'puff'], [0.26, 'flowers']],
  wald: [[0.18, 'leaves'], [0.18, 'mossrock'], [0.2, 'stump'], [0.1, 'log'], [0.03, 'puddle'], [0.16, 'tuft'], [0.1, 'stone']],
};

/** Alle Deko-Kandidaten einer Kachel (unabhängig von Pflanzen und Weltgröße). */
export function tileDecor(region, tx, ty) {
  const rr = rng(`${region}:tile:${tx}:${ty}`);
  const list = OUT_ITEMS[region] || OUT_ITEMS.blumenwiese;
  const n = (region === 'wald' ? 1 : 2) + Math.floor(rr() * 3);
  const res = [];
  for (let k = 0; k < n; k++) {
    let u = rr() * list.reduce((a, [p]) => a + p, 0), part = list[0][1];
    for (const [p, name] of list) { if ((u -= p) <= 0) { part = name; break; } }
    const [w, h] = DECO_SIZE[part];
    const x = tx * TILE + Math.ceil(w / 2) + 1 + Math.floor(rr() * Math.max(1, TILE - w - 2));
    const y = ty * TILE + h + 1 + Math.floor(rr() * Math.max(1, TILE - h - 2));
    const v = Math.floor(rr() * 3), flip = rr() < 0.5;
    const box = { x0: x - w / 2 - 2, x1: x + w / 2 + 2, y0: y - h - 2, y1: y + 2 };
    if (res.some((o) => !(box.x1 < o.box.x0 || box.x0 > o.box.x1 || box.y1 < o.box.y0 || box.y0 > o.box.y1))) continue;
    if (region === 'wald' && part === 'puddle' && res.some((o) => o.part === 'puddle')) continue;
    res.push({ part, x, y, v, flip, box });
  }
  return res;
}

/** Würde das Deko-Teil eine Pflanze verdecken oder in ihr stehen? */
export function blocksPlant(part, x, y, items) {
  const [w, h] = DECO_SIZE[part];
  for (const p of items) {
    const dx = Math.abs(p.x - x), dy = y - p.y;
    if (FLAT.has(part)) {
      if (dx < w / 2 + 5 && dy > -4 && dy < h + 3) return true;
    } else if (dx < w / 2 + 10 && dy > -5 && dy < h + 5) return true;
  }
  return false;
}

function outdoorDecor(layout) {
  const { W, H, region, items } = layout;
  const yMin = region === 'wald' ? 46 : 30;
  const out = [];
  for (let ty = 0; ty * TILE < H; ty++)
    for (let tx = 0; tx * TILE < W; tx++)
      for (const d of tileDecor(region, tx, ty)) {
        if (d.box.x0 < 2 || d.box.x1 > W - 2 || d.box.y0 < yMin || d.box.y1 > H - 1) continue;
        if (blocksPlant(d.part, d.x, d.y, items)) continue;
        const flat = FLAT.has(d.part);
        out.push({ ...piece(d.part, d.x, d.y, flat ? d.y - DECO_SIZE[d.part][1] - 6 : d.y, d.v, d.flip), region });
        // Eichhörnchen sitzt auf manchen Baumstümpfen
        if (d.part === 'stump' && rng(`sq:${d.x}:${d.y}`)() < 0.4)
          out.push(piece('squirrel', d.x + (d.flip ? 2 : -2), d.y - 7, d.y + 0.05, 0, d.flip));
      }
  return out;
}

function cmpKey(a, b) {
  const pa = a.split(',').map(Number), pb = b.split(',').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

// --- Sprites ---------------------------------------------------------------------

function fin(art, ax, ay, extra = {}) {
  return { ...art.toCanvas(), ax, ay, ...extra };
}

/** Füllt ein Trapez (für Töpfe, Wannen). */
function trap(l, cx, y0, y1, w0, w1, tone = null) {
  for (let y = y0; y <= y1; y++) {
    const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    const hw = (w0 + (w1 - w0) * t) / 2;
    for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) l.set(x, y, tone);
  }
}

const FONT = { O: ['111', '101', '101', '101', '111'], F: ['111', '100', '110', '100', '100'], E: ['111', '100', '110', '100', '111'], N: ['1001', '1101', '1011', '1001', '1001'] };
function text(l, x, y, str, tone) {
  for (const ch of str) {
    const g = FONT[ch];
    g.forEach((row, j) => [...row].forEach((b, i) => b === '1' && l.set(x + i, y + j, tone)));
    x += g[0].length + 1;
  }
}

const S = {
  books(v) {
    const a = new PixelArt(14, 11);
    const ramps = [['petal_red', 'leaf_deep', 'petal_blue'], ['petal_yellow', 'terracotta', 'leaf_sage'], ['petal_blue', 'cream', 'petal_red']][v % 3];
    const rows = [[2, 7, 10], [3, 4, 8], [2, 1, 7]];
    rows.forEach(([x, y, w], i) => {
      const b = a.layer(ramps[i]);
      b.rect(x, y, w, 2);
      const p = a.layer('cream', { outline: false, shading: false });
      p.set(x + w - 1, y, LIGHT).set(x + w - 1, y + 1, BASE);
      const band = a.layer(ramps[i], { outline: false, shading: false });
      band.set(x + 2, y, HIGH).set(x + 2, y + 1, LIGHT);
    });
    return fin(a, 7, 10);
  },
  sprayer(v) {
    const a = new PixelArt(9, 13);
    const ramp = ['petal_blue', 'leaf', 'petal_pink'][v % 3];
    const body = a.layer(ramp);
    body.rect(2, 5, 5, 7);
    const lvl = a.layer(ramp, { outline: false, shading: false });
    for (let x = 3; x <= 5; x++) lvl.set(x, 7, HIGH);
    lvl.set(3, 6, HIGH);
    const head = a.layer('petal_white');
    head.rect(3, 3, 3, 2).rect(2, 1, 4, 2);
    head.set(6, 1, SHADE).set(5, 4, SHADE);
    return fin(a, 4, 12);
  },
  pot(v) {
    const a = new PixelArt(12, 10);
    const ramp = ['terracotta', 'ph_pot_slate', 'terracotta'][v % 3];
    const body = a.layer(ramp);
    trap(body, 6, 4, 8, 8, 6);
    const rim = a.layer(ramp);
    rim.rect(1, 2, 10, 2);
    const ins = a.layer('soil', { outline: false, shading: false });
    for (let x = 2; x <= 9; x++) ins.set(x, 2, x < 4 ? OUTLINE : SHADE);
    if (v === 2) {
      // zweiter, umgedrehter Topf obendrauf
      const t = a.layer(ramp);
      trap(t, 6, 0, 1, 4, 6);
    }
    return fin(a, 6, 9);
  },
  frame(v) {
    const a = new PixelArt(12, 12);
    const f = a.layer('wood', { shading: false });
    f.rect(1, 1, 10, 10, BASE);
    for (let i = 1; i <= 10; i++) f.set(i, 1, LIGHT).set(1, i, LIGHT).set(i, 10, SHADE).set(10, i, SHADE);
    picture(a, 3, 3, 6, 6, v);
    return fin(a, 6, 11);
  },
  stand(v) {
    const a = new PixelArt(10, 10);
    const f = a.layer('wood', { shading: false });
    f.rect(1, 1, 8, 8, BASE);
    for (let i = 1; i <= 8; i++) f.set(i, 1, LIGHT).set(1, i, LIGHT);
    picture(a, 2, 2, 6, 6, v);
    return fin(a, 5, 9);
  },
  basket(v) {
    // Hängeampel mit Efeutute; Anker = Haken an der Decke
    const a = new PixelArt(16, 36);
    const ch = a.layer('dark', { outline: false, shading: false });
    ch.line(8, 0, 3, 11, LIGHT).line(8, 0, 13, 11, LIGHT).line(8, 0, 8, 10, HIGH);
    const vine = a.layer('stem', { outline: false, shading: false });
    vine.line(3, 14, 2, 24, SHADE).line(2, 24, 3, 30, SHADE);
    vine.line(12, 14, 13, 22, SHADE).line(13, 22, 12, 34, SHADE);
    vine.line(7, 16, 7, 21, SHADE);
    const pot = a.layer(v ? 'cream' : 'terracotta');
    pot.rect(3, 12, 10, 2);
    trap(pot, 8, 14, 16, 9, 6);
    const lv = a.layer('leaf');
    for (const [x, y] of [[4, 10], [7, 9], [10, 10], [12, 11], [2, 12], [2, 17], [3, 21], [1, 25], [3, 29], [13, 16], [14, 20], [12, 24], [13, 28], [12, 32], [7, 19]])
      lv.rect(x, y, 2, 2);
    return fin(a, 8, 0);
  },
  register() {
    const a = new PixelArt(16, 13);
    const disp = a.layer('dark');
    disp.rect(9, 1, 5, 3);
    const body = a.layer('ph_pot_slate');
    body.rect(1, 8, 14, 4);
    const keys = a.layer('cream');
    keys.rect(2, 5, 11, 3);
    const k = a.layer('cream', { outline: false, shading: false });
    for (let x = 3; x <= 11; x += 2) k.set(x, 6, SHADE);
    const dr = a.layer('ph_pot_slate', { outline: false, shading: false });
    for (let x = 3; x <= 12; x++) dr.set(x, 10, SHADE);
    dr.set(7, 9, HIGH).set(8, 9, HIGH);
    const g = a.layer('wa_glow', { outline: false, shading: false, glow: true });
    for (let x = 10; x <= 12; x++) g.set(x, 2, LIGHT);
    return fin(a, 8, 12, { halo: { dx: 3, dy: -10, r: 8, rgb: [120, 240, 210] } });
  },
  bell() {
    const a = new PixelArt(8, 7);
    const b = a.layer('wood');
    b.rect(1, 5, 6, 1);
    const d = a.layer('petal_yellow');
    d.ellipse(4, 4, 2.5, 2);
    d.set(4, 1, HIGH);
    return fin(a, 4, 6);
  },
  soilbox(v) {
    const a = new PixelArt(14, 11);
    const box = a.layer('gh_butternut');
    box.rect(2, 4, 10, 6);
    const soil = a.layer('soil', { shading: false });
    soil.rect(3, 2, 8, 2, BASE);
    soil.set(4, 2, LIGHT).set(8, 3, HIGH).set(6, 2, LIGHT);
    const fl = a.layer('gh_butternut', { shading: false });
    fl.rect(0, 2, 2, 2, LIGHT).rect(12, 2, 2, 2, SHADE);
    const tape = a.layer('gh_butternut', { outline: false, shading: false });
    for (let y = 5; y <= 8; y++) tape.set(7, y, HIGH);
    if (v === 1) tape.rect(4, 6, 2, 2, SHADE);
    return fin(a, 7, 10);
  },
  stool() {
    const a = new PixelArt(12, 12);
    const legs = a.layer('wood', { outline: false, shading: false });
    legs.line(3, 4, 2, 10, SHADE).line(9, 4, 10, 10, OUTLINE).line(6, 5, 6, 11, BASE);
    legs.line(3, 8, 9, 8, SHADE);
    legs.set(2, 11, OUTLINE).set(10, 11, OUTLINE);
    const seat = a.layer('wood');
    seat.ellipse(6, 3, 5, 1.8);
    return fin(a, 6, 11);
  },
  armchair(v) {
    const a = new PixelArt(22, 20);
    const ramp = v ? 'terracotta' : 'leaf_sage';
    const back = a.layer(ramp);
    back.rect(3, 1, 16, 10);
    const tuft = a.layer(ramp, { outline: false, shading: false });
    for (const x of [7, 11, 15]) tuft.set(x, 5, SHADE);
    const seat = a.layer(ramp);
    seat.rect(4, 10, 14, 4, LIGHT);
    seat.rect(4, 14, 14, 3, SHADE);
    for (let x = 4; x < 18; x++) seat.set(x, 10, HIGH);
    const arms = a.layer(ramp);
    arms.rect(1, 8, 4, 9);
    arms.rect(17, 8, 4, 9);
    const legs = a.layer('wood', { outline: false, shading: false });
    for (const x of [2, 3, 18, 19]) legs.set(x, 18, x % 2 ? SHADE : OUTLINE);
    return fin(a, 11, 18);
  },
  cat(v) {
    // schlafende Katze, eingerollt
    const a = new PixelArt(16, 9);
    const ramp = v ? 'ph_pot_slate' : 'petal_orange';
    const body = a.layer(ramp);
    body.ellipse(9, 5, 6, 3);
    const st = a.layer(ramp, { outline: false, shading: false });
    for (const [x, y] of [[8, 3], [10, 3], [12, 4], [7, 4]]) st.set(x, y, SHADE);
    const head = a.layer(ramp);
    head.ellipse(4, 5.5, 2.6, 2.2);
    head.set(3, 2, BASE).set(5, 2, BASE);
    const tail = a.layer(ramp);
    tail.line(6, 8, 13, 7, LIGHT);
    const face = a.layer('dark', { outline: false, shading: false });
    face.set(3, 5, LIGHT).set(4, 5, LIGHT);
    const nose = a.layer('petal_pink', { outline: false, shading: false });
    nose.set(2, 6, BASE);
    return fin(a, 8, 8);
  },
  sign() {
    // „OFFEN“-Schild, hängt am Fensterkreuz; Anker = Aufhängung oben
    const a = new PixelArt(26, 13);
    const str = a.layer('dark', { outline: false, shading: false });
    str.line(13, 0, 5, 4, HIGH).line(13, 0, 20, 4, HIGH);
    const b = a.layer('wood');
    b.rect(1, 4, 24, 7);
    const pl = a.layer('cream', { outline: false, shading: false });
    pl.rect(2, 5, 22, 5, LIGHT);
    const t = a.layer('leaf_deep', { outline: false, shading: false });
    text(t, 3, 5, 'OFFEN', BASE);
    return fin(a, 13, 0);
  },
  // --- Gewächshaus
  barrow(v) {
    const a = new PixelArt(24, 14);
    const hd = a.layer('wood', { outline: false, shading: false });
    hd.line(7, 6, 0, 9, BASE).line(7, 7, 1, 10, SHADE);
    const legs = a.layer('dark', { outline: false, shading: false });
    legs.line(9, 9, 8, 13, HIGH).line(15, 9, 14, 13, LIGHT);
    const tub = a.layer(v ? 'petal_red' : 'leaf_deep');
    trap(tub, 13, 3, 8, 16, 9);
    const soil = a.layer('soil', { outline: false, shading: false });
    for (let x = 6; x <= 19; x++) soil.set(x, 3, x % 4 ? BASE : LIGHT);
    const wh = a.layer('dark');
    wh.ellipse(19.5, 10.5, 2.5, 2.5);
    wh.set(19, 10, HIGH);
    return fin(a, 12, 13);
  },
  sack(v) {
    const a = new PixelArt(14, 12);
    const ramp = v ? 'gh_butternut' : 'leaf';
    if (v) {
      const lying = a.layer(ramp);
      lying.rect(7, 7, 6, 4);
    }
    const s = a.layer(ramp);
    s.rect(2, 3, 7, 8);
    s.rect(3, 1, 5, 2, SHADE);
    const lab = a.layer('cream', { outline: false, shading: false });
    lab.rect(3, 5, 5, 3, LIGHT);
    lab.set(5, 6, SHADE);
    const soil = a.layer('soil', { outline: false, shading: false });
    soil.set(4, 1, BASE).set(5, 1, LIGHT).set(6, 1, BASE);
    return fin(a, 6, 11);
  },
  toolboard() {
    const a = new PixelArt(26, 18);
    const b = a.layer('wood');
    b.rect(1, 2, 24, 12);
    const holes = a.layer('wood', { outline: false, shading: false });
    for (let y = 4; y <= 12; y += 3) for (let x = 3; x <= 23; x += 3) holes.set(x, y, SHADE);
    const rake = a.layer('wood', { outline: false, shading: false });
    rake.line(5, 3, 5, 16, HIGH);
    const rk = a.layer('dark');
    rk.rect(3, 15, 5, 1);
    const spade = a.layer('wood', { outline: false, shading: false });
    spade.line(12, 1, 12, 9, LIGHT);
    spade.rect(11, 1, 3, 1, BASE);
    const bl = a.layer('ph_pot_slate');
    bl.rect(10, 9, 5, 5);
    bl.set(11, 14, BASE).set(12, 14, BASE).set(13, 14, BASE);
    const sh = a.layer('ph_pot_slate', { outline: false, shading: false });
    sh.line(18, 4, 21, 10, HIGH).line(21, 4, 18, 10, LIGHT);
    const hd = a.layer('petal_red');
    hd.rect(17, 11, 2, 2).rect(20, 11, 2, 2);
    return fin(a, 13, 17);
  },
  seedshelf() {
    const a = new PixelArt(24, 24);
    const posts = a.layer('wood');
    posts.rect(1, 1, 2, 22).rect(21, 1, 2, 22);
    for (const y of [8, 15, 21]) {
      const b = a.layer('wood');
      b.rect(1, y, 22, 2);
      for (const tx of [4, 13]) {
        const tr = a.layer('dark');
        tr.rect(tx, y - 2, 7, 2);
        const sd = a.layer('leaf', { outline: false, shading: false });
        for (let x = tx; x < tx + 7; x += 2) sd.set(x, y - 3, (x + y) % 4 ? LIGHT : HIGH);
        if (y !== 21) for (let x = tx + 1; x < tx + 7; x += 2) sd.set(x, y - 4, BASE);
      }
    }
    return fin(a, 12, 23);
  },
  straw() {
    const a = new PixelArt(18, 12);
    const b = a.layer('gh_pumpkin_beige');
    b.rect(1, 2, 16, 9);
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
    const h = a.layer(ramp);
    h.ellipse(7, 6, 5.5, 4.5);
    const ring = a.layer(ramp, { outline: false, shading: false });
    for (let y = 2; y <= 10; y++)
      for (let x = 1; x <= 13; x++) {
        const d = Math.hypot((x + 0.5 - 7) / 5.5, (y + 0.5 - 6) / 4.5);
        if (d < 1 && Math.abs(d - 0.7) < 0.09) ring.set(x, y, SHADE);
      }
    ring.ellipse(7, 6, 2, 1.4, OUTLINE);
    const n = a.layer('petal_white');
    n.rect(11, 9, 2, 1);
    return fin(a, 7, 11);
  },
  thermo() {
    const a = new PixelArt(5, 14);
    const b = a.layer('petal_white');
    b.rect(1, 1, 3, 10);
    const m = a.layer('petal_red', { outline: false, shading: false });
    for (let y = 5; y <= 10; y++) m.set(2, y, BASE);
    const bulb = a.layer('petal_red');
    bulb.ellipse(2.5, 11.5, 1.6, 1.6);
    return fin(a, 2, 13);
  },
  stake(v) {
    const a = new PixelArt(5, 9);
    const s = a.layer('wood', { outline: false, shading: false });
    s.line(2, 4, 2, 8, SHADE);
    const l = a.layer(['cream', 'petal_white', 'gh_butternut'][v % 3]);
    l.rect(1, 1, 3, 3, LIGHT);
    l.set(2, 2, SHADE);
    return fin(a, 2, 8);
  },
  // --- Blumenwiese / Wald
  tuft(v, region) {
    const a = new PixelArt(11, 10);
    const ramp = region === 'wald' ? 'wa_moos' : v === 2 ? 'leaf_sage' : 'leaf_deep';
    const g = a.layer(ramp, { outline: false, shading: false });
    const blades = [[1, 3], [3, 0], [5, 1], [8, 2], [9, 5], [4, 3], [2, 6], [7, 5], [6, 0]];
    for (const [tx, ty] of blades) {
      g.line(5, 9, tx, ty, tx < 5 ? LIGHT : BASE);
      g.set(tx, ty, HIGH);
    }
    for (let x = 3; x <= 7; x++) g.set(x, 9, OUTLINE);
    g.set(4, 8, SHADE).set(6, 8, SHADE);
    if (v === 1 && region !== 'wald') {
      const f = a.layer('petal_white', { outline: false, shading: false });
      f.set(3, 0, HIGH).set(8, 2, LIGHT);
    }
    return fin(a, 5, 9);
  },
  flowers(v) {
    // kleine Wildblumen (keine Pflanzenart, nur Bodendeko)
    const a = new PixelArt(9, 6);
    const st = a.layer('stem', { outline: false, shading: false });
    st.line(2, 5, 2, 2, SHADE).line(5, 5, 6, 1, BASE).line(4, 5, 4, 3, SHADE);
    const cols = [['petal_white', 'petal_yellow', 'petal_blue'], ['petal_yellow', 'petal_white', 'petal_pink'], ['petal_blue', 'petal_purple', 'petal_white']][v % 3];
    [[2, 1], [6, 0], [4, 2]].forEach(([x, y], i) => {
      const f = a.layer(cols[i], { outline: false, shading: false });
      f.set(x, y, LIGHT).set(x - 1, y, BASE).set(x + 1, y, SHADE).set(x, y - 1, HIGH).set(x, y + 1, BASE);
      a.layer('petal_yellow', { outline: false, shading: false }).set(x, y, cols[i] === 'petal_yellow' ? SHADE : HIGH);
    });
    return fin(a, 4, 5);
  },
  stone(v) {
    const a = new PixelArt(11, 7);
    const s = a.layer('stone');
    if (v === 0) s.ellipse(5, 4, 3.5, 2.4);
    else if (v === 1) { s.ellipse(4, 4, 3, 2.2); a.layer('stone').ellipse(8, 5, 1.8, 1.4); }
    else s.ellipse(5.5, 4.5, 2.2, 1.6);
    return fin(a, 5, 6);
  },
  mossrock(v) {
    const a = new PixelArt(12, 8);
    const s = a.layer('stone');
    s.ellipse(6, 4.5, 4.6 - (v % 2), 3);
    const m = a.layer('wa_moos', { outline: false });
    m.ellipse(5, 2.6, 3.2, 1.4);
    m.set(2, 4).set(3, 4);
    if (v === 2) {
      const g = a.layer('wa_glow', { outline: false, shading: false, glow: true });
      g.set(8, 2, LIGHT).set(9, 3, HIGH);
    }
    return fin(a, 6, 7, v === 2 ? { halo: { dx: 2, dy: -5, r: 7, rgb: [120, 240, 210] } } : {});
  },
  puff(v) {
    // Pusteblume (v 0/2) bzw. gelber Löwenzahn (v 1)
    const a = new PixelArt(9, 12);
    const st = a.layer('stem', { outline: false, shading: false });
    st.line(4, 11, 4, 5, LIGHT);
    const lv = a.layer('leaf', { outline: false, shading: false });
    lv.line(1, 10, 3, 11, SHADE).line(7, 10, 5, 11, BASE).set(1, 10, LIGHT).set(7, 10, LIGHT);
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
  stump(v) {
    const a = new PixelArt(14, 12);
    const t = a.layer('wood');
    t.rect(2, 4, 10, 6);
    const bark = a.layer('wood', { outline: false, shading: false });
    for (const x of [4, 7, 10]) for (let y = 5; y <= 9; y++) if ((x + y) % 3) bark.set(x, y, SHADE);
    const root = a.layer('wood');
    root.rect(0, 9, 3, 2).rect(11, 9, 3, 2);
    const top = a.layer('gh_pumpkin_beige');
    top.ellipse(7, 3.5, 5, 1.8);
    const ring = a.layer('gh_butternut', { outline: false, shading: false });
    ring.set(6, 3, SHADE).set(7, 3, SHADE).set(8, 4, BASE).set(5, 4, BASE);
    const moss = a.layer('wa_moos', { outline: false });
    moss.rect(2, 6, 2, 3);
    if (v === 2) {
      const g = a.layer('wa_glow', { glow: true });
      g.set(11, 6).set(12, 7);
      return fin(a, 7, 11, { halo: { dx: 4, dy: -5, r: 8, rgb: [120, 240, 210] } });
    }
    return fin(a, 7, 11);
  },
  log(v) {
    const a = new PixelArt(22, 9);
    const b = a.layer('wood');
    b.rect(2, 2, 16, 5);
    const bark = a.layer('wood', { outline: false, shading: false });
    for (let x = 3; x < 18; x += 3) bark.set(x, 3 + (x % 2), SHADE).set(x + 1, 5, OUTLINE);
    const br = a.layer('wood', { outline: false, shading: false });
    br.line(7, 1, 5, 0, BASE);
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
      const n = (hashString(`lv${v}:${i}`) >>> 0);
      const l = a.layer(ramps[n % 3], { outline: false, shading: false });
      const x = 1 + (n >>> 3) % 9, y = 1 + (n >>> 7) % 4;
      l.set(x, y, LIGHT).set(x + 1, y, BASE).set(x, y + 1, SHADE);
    }
    return fin(a, 6, 5);
  },
  puddle(v) {
    const a = new PixelArt(22, 9);
    const bank = a.layer('soil', { outline: false, shading: false });
    bank.ellipse(11, 4.5, 10.5, 4, SHADE);
    const w = a.layer('bw_skyblue', { outline: false, shading: false });
    w.ellipse(11, 4.8, 9, 3, SHADE);
    for (let x = 4; x <= 17; x++) w.set(x, 2, OUTLINE);
    w.line(6, 5, 9, 5, LIGHT).line(13, 6, 15, 6, BASE);
    const st = a.layer('stone');
    if (v) st.set(18, 6).set(19, 6);
    return fin(a, 11, 8);
  },
  squirrel() {
    // sitzendes Eichhörnchen (Profil nach rechts), buschiger Schwanz hinten hoch
    const a = new PixelArt(11, 12);
    const tail = a.layer('petal_orange');
    tail.rect(1, 3, 2, 6).rect(2, 1, 2, 3).set(4, 1).set(3, 9);
    const tl = a.layer('petal_orange', { outline: false, shading: false });
    tl.set(2, 1, HIGH).set(1, 4, LIGHT).set(1, 5, LIGHT);
    const body = a.layer('bw_russet');
    body.rect(5, 6, 3, 5);
    body.set(4, 8).set(4, 9).set(8, 10);
    const head = a.layer('bw_russet');
    head.rect(6, 3, 3, 3).set(9, 5, LIGHT);
    head.set(6, 2, BASE);
    const belly = a.layer('cream', { outline: false, shading: false });
    belly.set(7, 7, LIGHT).set(7, 8, LIGHT).set(7, 9, BASE);
    const eye = a.layer('dark', { outline: false, shading: false });
    eye.set(8, 4, BASE);
    return fin(a, 6, 11);
  },
};

function picture(a, x, y, w, h, v) {
  if (v === 0) {
    // Landschaft
    const sky = a.layer('bw_skyblue', { outline: false, shading: false });
    sky.rect(x, y, w, h, LIGHT);
    const hill = a.layer('leaf', { outline: false, shading: false });
    for (let i = 0; i < w; i++) for (let j = Math.round(h * 0.55 + Math.sin(i) * 0.8); j < h; j++) hill.set(x + i, y + j, j > h * 0.8 ? SHADE : BASE);
    a.layer('petal_yellow', { outline: false, shading: false }).set(x + w - 2, y + 1, HIGH);
  } else if (v === 1) {
    // Botanischer Druck: Blatt auf Creme
    const bg = a.layer('cream', { outline: false, shading: false });
    bg.rect(x, y, w, h, HIGH);
    const lf = a.layer('leaf_deep', { outline: false, shading: false });
    lf.ellipse(x + w / 2, y + h / 2 - 0.5, w / 2 - 1, h / 2 - 1, BASE);
    lf.line(x + 1, y + h - 1, x + w - 2, y + 1, LIGHT);
  } else {
    // Monstera-Silhouette auf Terrakotta
    const bg = a.layer('terracotta', { outline: false, shading: false });
    bg.rect(x, y, w, h, LIGHT);
    const lf = a.layer('leaf', { outline: false, shading: false });
    lf.ellipse(x + w / 2, y + h / 2, w / 2 - 0.6, h / 2 - 0.8, SHADE);
    lf.set(x + 1, y + h / 2, LIGHT).set(x + w - 2, y + h / 2 - 1, LIGHT);
  }
}

const spriteCache = new Map();

/** Sprite eines Deko-Teils → { img, glow, ax, ay, halo? } (gecacht). */
export function decoSprite(part, v = 0, region = '') {
  const key = `${part}|${v}|${part === 'tuft' ? region : ''}`;
  if (!spriteCache.has(key)) spriteCache.set(key, S[part] ? S[part](v, region) : null);
  return spriteCache.get(key);
}

// --- Rand-Deko (für scenery.js, direkt in den Boden gezeichnet) -----------------

/** Holzzaun über die ganze Breite (Pfosten alle 12 px). */
export function fenceArt(W) {
  const a = new PixelArt(W, 16);
  const rails = a.layer('wood');
  rails.rect(0, 5, W, 2).rect(0, 10, W, 2);
  for (let x = 4; x < W - 2; x += 12) {
    const p = a.layer('wood');
    p.rect(x, 2, 3, 12);
    p.set(x + 1, 1, LIGHT);
  }
  return a;
}

export function benchArt() {
  const a = new PixelArt(28, 14);
  const legs = a.layer('wood', { outline: false, shading: false });
  for (const x of [4, 5, 22, 23]) for (let y = 9; y <= 13; y++) legs.set(x, y, x % 2 ? OUTLINE : SHADE);
  const back = a.layer('wood');
  back.rect(3, 1, 22, 2).rect(3, 4, 22, 2);
  const sup = a.layer('wood');
  sup.rect(5, 1, 2, 7).rect(21, 1, 2, 7);
  const seat = a.layer('wood');
  seat.rect(1, 8, 26, 2);
  for (let x = 1; x < 27; x++) seat.set(x, 8, HIGH);
  return a;
}

/** Laterne an einem Zaunpfosten (leuchtet nachts). */
export function lanternArt() {
  const a = new PixelArt(7, 11);
  const hook = a.layer('dark', { outline: false, shading: false });
  hook.set(3, 0, HIGH).set(3, 1, HIGH);
  const f = a.layer('dark');
  f.rect(1, 3, 5, 6, HIGH);
  f.rect(2, 2, 3, 1, LIGHT);
  const g = a.layer('lamp', { outline: false, shading: false, glow: true });
  g.rect(2, 4, 3, 4, BASE);
  g.set(2, 4, HIGH);
  return a;
}

/** Baum am Waldrand (Stamm mit Krone). */
export function treeArt(v) {
  const a = new PixelArt(30, 60);
  const trunk = a.layer('wood');
  trunk.rect(11, 18, 8, 40);
  const bark = a.layer('wood', { outline: false, shading: false });
  for (let y = 20; y < 57; y += 3) bark.set(13 + ((y * 7) % 4), y, SHADE).set(13 + ((y * 7) % 4), y + 1, SHADE);
  const roots = a.layer('wood');
  roots.rect(8, 55, 4, 3).rect(18, 55, 4, 3).rect(6, 57, 3, 1).rect(21, 57, 3, 1);
  const ramp = v ? 'leaf' : 'leaf_deep';
  const c1 = a.layer(ramp);
  c1.ellipse(15, 11, 13, 10);
  const c2 = a.layer(ramp);
  c2.ellipse(8, 16, 7, 5).ellipse(22, 17, 7, 5);
  const moss = a.layer('wa_moos', { outline: false });
  moss.rect(11, 48, 2, 6);
  return a;
}


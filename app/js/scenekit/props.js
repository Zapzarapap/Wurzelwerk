// Gemeinsame Kleinteile (Requisiten) für alle Szenen: prop(name, v) → Sprite
// { img, glow, ax, ay, halo? } mit Anker = Fußpunkt Mitte (ax, ay).
// Stil wie die Pflanzen-Sprites: Rampen aus palette.js, Outline in der dunkelsten
// Farbe der Rampe, Licht von oben links. Regionsspezifisches gehört in die
// jeweilige app/js/scenes/<region>.js – diese Datei bitte nur gemeinsam ändern.
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH, trap, fin, sprite } from './draw.js';

/** Größe [w, h] der Teile (für Abstands-/Ausweichboxen). */
export const PROP_SIZE = {
  books: [14, 11], sprayer: [9, 13], pot: [12, 10], frame: [12, 12], stand: [10, 10], can: [16, 12],
  sack: [14, 12], soilbox: [14, 11], stool: [12, 12], cat: [16, 9], catsit: [10, 13], stone: [11, 7],
  tuft: [11, 10], candle: [6, 9], teacup: [9, 9], jar: [7, 9], potstack: [12, 13], crate: [18, 13], lantern: [7, 11],
  basket: [16, 36], bookpile: [12, 9],
};

/** Box eines Teils am Fußpunkt (für piece.box / yield). */
export function propBox(name, x, y, pad = 1) {
  const [w, h] = PROP_SIZE[name] || [12, 12];
  return { x0: x - w / 2 - pad, x1: x + w / 2 + pad, y0: y - h - pad, y1: y + pad };
}

/** Kleines Bild (Landschaft, botanischer Druck, Monstera) für Rahmen. */
export function picture(a, x, y, w, h, v) {
  v %= 3;
  if (v === 0) {
    const sky = a.layer('bw_skyblue', { outline: false, shading: false });
    sky.rect(x, y, w, h, LIGHT);
    const hill = a.layer('leaf', { outline: false, shading: false });
    for (let i = 0; i < w; i++) for (let j = Math.round(h * 0.55 + Math.sin(i) * 0.8); j < h; j++) hill.set(x + i, y + j, j > h * 0.8 ? SHADE : BASE);
    a.layer('petal_yellow', { outline: false, shading: false }).set(x + w - 2, y + 1, HIGH);
  } else if (v === 1) {
    const bg = a.layer('cream', { outline: false, shading: false });
    bg.rect(x, y, w, h, HIGH);
    const lf = a.layer('leaf_deep', { outline: false, shading: false });
    lf.ellipse(x + w / 2, y + h / 2 - 0.5, w / 2 - 1, h / 2 - 1, BASE);
    lf.line(x + 1, y + h - 1, x + w - 2, y + 1, LIGHT);
  } else {
    const bg = a.layer('terracotta', { outline: false, shading: false });
    bg.rect(x, y, w, h, LIGHT);
    const lf = a.layer('leaf', { outline: false, shading: false });
    lf.ellipse(x + w / 2, y + h / 2, w / 2 - 0.6, h / 2 - 0.8, SHADE);
    lf.set(x + 1, y + h / 2, LIGHT).set(x + w - 2, y + h / 2 - 1, LIGHT);
  }
}

const P = {
  books(v) {
    const a = new PixelArt(14, 11);
    const ramps = [['petal_red', 'leaf_deep', 'petal_blue'], ['petal_yellow', 'terracotta', 'leaf_sage'], ['petal_blue', 'cream', 'petal_red']][v % 3];
    [[2, 7, 10], [3, 4, 8], [2, 1, 7]].forEach(([x, y, w], i) => {
      a.layer(ramps[i]).rect(x, y, w, 2);
      a.layer('cream', { outline: false, shading: false }).set(x + w - 1, y, LIGHT).set(x + w - 1, y + 1, BASE);
      a.layer(ramps[i], { outline: false, shading: false }).set(x + 2, y, HIGH).set(x + 2, y + 1, LIGHT);
    });
    return fin(a, 7, 10);
  },
  bookpile(v) {
    // stehende Bücher (Buchrücken), für Regale
    const a = new PixelArt(12, 9);
    const ramps = [['petal_red', 'leaf_deep', 'cream', 'petal_blue'], ['terracotta', 'petal_yellow', 'leaf_sage', 'wood'], ['petal_blue', 'petal_purple', 'cream', 'leaf']][v % 3];
    let x = 1;
    ramps.forEach((r, i) => {
      const h = [7, 6, 7, 5][(i + v) % 4], w = i === 2 ? 3 : 2;
      const b = a.layer(r, { shading: false });
      b.rect(x, 8 - h, w, h, BASE);
      for (let y = 8 - h; y < 8; y++) b.set(x, y, LIGHT);
      a.layer(r, { outline: false, shading: false }).set(x + (w > 2 ? 1 : 0), 8 - h + 2, HIGH);
      x += w + 1;
    });
    return fin(a, 6, 8);
  },
  sprayer(v) {
    const a = new PixelArt(9, 13);
    const ramp = ['petal_blue', 'leaf', 'petal_pink'][v % 3];
    a.layer(ramp).rect(2, 5, 5, 7);
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
    trap(a.layer(ramp), 6, 4, 8, 8, 6);
    a.layer(ramp).rect(1, 2, 10, 2);
    const ins = a.layer('soil', { outline: false, shading: false });
    for (let x = 2; x <= 9; x++) ins.set(x, 2, x < 4 ? OUTLINE : SHADE);
    if (v % 3 === 2) trap(a.layer(ramp), 6, 0, 1, 4, 6);
    return fin(a, 6, 9);
  },
  potstack(v) {
    // gestapelte leere Töpfe
    const a = new PixelArt(12, 13);
    const ramp = v % 2 ? 'ph_pot_slate' : 'terracotta';
    for (let k = 0; k < 3; k++) {
      const l = a.layer(ramp);
      trap(l, 6, 9 - k * 3, 11 - k * 3, 9, 7);
      l.rect(2, 8 - k * 3, 8, 1, LIGHT);
    }
    return fin(a, 6, 12);
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
  can(v) {
    // Gießkanne
    const a = new PixelArt(16, 12);
    const ax = 7, ay = 10;
    const ramp = ['petal_white', 'leaf_deep', 'ph_pot_slate'][v % 3];
    const spout = a.layer(ramp, { outline: false, shading: false });
    for (let i = 0; i < 4; i++) spout.set(ax + 4 + i, ay - 3 - i, i === 3 ? OUTLINE : BASE);
    spout.set(ax + 8, ay - 7, SHADE).set(ax + 8, ay - 6, OUTLINE);
    a.layer(ramp).rect(ax - 3, ay - 5, 7, 5);
    const handle = a.layer(ramp, { outline: false, shading: false });
    for (let x = ax - 2; x <= ax + 2; x++) handle.set(x, ay - 8, SHADE);
    handle.set(ax - 3, ay - 7, SHADE).set(ax + 3, ay - 7, SHADE).set(ax - 3, ay - 6, SHADE).set(ax + 3, ay - 6, SHADE);
    const band = a.layer(ramp, { outline: false, shading: false });
    for (let x = ax - 3; x <= ax + 3; x++) band.set(x, ay - 3, SHADE);
    return fin(a, ax, ay);
  },
  sack(v) {
    const a = new PixelArt(14, 12);
    const ramp = v % 2 ? 'gh_butternut' : 'leaf';
    if (v % 2) a.layer(ramp).rect(7, 7, 6, 4);
    const s = a.layer(ramp);
    s.rect(2, 3, 7, 8);
    s.rect(3, 1, 5, 2, SHADE);
    const lab = a.layer('cream', { outline: false, shading: false });
    lab.rect(3, 5, 5, 3, LIGHT);
    lab.set(5, 6, SHADE);
    a.layer('soil', { outline: false, shading: false }).set(4, 1, BASE).set(5, 1, LIGHT).set(6, 1, BASE);
    return fin(a, 6, 11);
  },
  soilbox(v) {
    const a = new PixelArt(14, 11);
    a.layer('gh_butternut').rect(2, 4, 10, 6);
    const soil = a.layer('soil', { shading: false });
    soil.rect(3, 2, 8, 2, BASE);
    soil.set(4, 2, LIGHT).set(8, 3, HIGH).set(6, 2, LIGHT);
    const fl = a.layer('gh_butternut', { shading: false });
    fl.rect(0, 2, 2, 2, LIGHT).rect(12, 2, 2, 2, SHADE);
    const tape = a.layer('gh_butternut', { outline: false, shading: false });
    for (let y = 5; y <= 8; y++) tape.set(7, y, HIGH);
    if (v % 2) tape.rect(4, 6, 2, 2, SHADE);
    return fin(a, 7, 10);
  },
  crate(v) {
    const a = new PixelArt(18, 13);
    const ramp = v % 2 ? 'ph_pot_slate' : 'wood';
    const c = a.layer(ramp);
    for (let y = 3; y <= 11; y++) for (let x = 2; x <= 15; x++) c.set(x, y, (y - 3) % 4 === 3 ? SHADE : x === 2 ? LIGHT : x === 15 ? SHADE : BASE);
    for (let x = 2; x <= 15; x++) c.set(x, 2, HIGH);
    if (v % 3 === 2) {
      // mit Äpfeln/Knollen
      const f = a.layer('cap_red', { outline: false, shading: false });
      for (const x of [4, 7, 10, 13]) f.set(x, 1, BASE).set(x + 1, 1, LIGHT);
    }
    return fin(a, 9, 12);
  },
  stool() {
    const a = new PixelArt(12, 12);
    const legs = a.layer('wood', { outline: false, shading: false });
    legs.line(3, 4, 2, 10, SHADE).line(9, 4, 10, 10, OUTLINE).line(6, 5, 6, 11, BASE);
    legs.line(3, 8, 9, 8, SHADE);
    legs.set(2, 11, OUTLINE).set(10, 11, OUTLINE);
    a.layer('wood').ellipse(6, 3, 5, 1.8);
    return fin(a, 6, 11);
  },
  cat(v) {
    // schlafende Katze, eingerollt
    const a = new PixelArt(16, 9);
    const ramp = ['petal_orange', 'ph_pot_slate', 'cream'][v % 3];
    a.layer(ramp).ellipse(9, 5, 6, 3);
    const st = a.layer(ramp, { outline: false, shading: false });
    for (const [x, y] of [[8, 3], [10, 3], [12, 4], [7, 4]]) st.set(x, y, SHADE);
    const head = a.layer(ramp);
    head.ellipse(4, 5.5, 2.6, 2.2);
    head.set(3, 2, BASE).set(5, 2, BASE);
    a.layer(ramp).line(6, 8, 13, 7, LIGHT);
    a.layer('dark', { outline: false, shading: false }).set(3, 5, LIGHT).set(4, 5, LIGHT);
    a.layer('petal_pink', { outline: false, shading: false }).set(2, 6, BASE);
    return fin(a, 8, 8);
  },
  catsit(v) {
    // sitzende Katze von hinten/seitlich, Schwanz um die Pfoten
    const a = new PixelArt(10, 13);
    const ramp = ['petal_orange', 'ph_pot_slate', 'cream'][v % 3];
    const body = a.layer(ramp);
    body.ellipse(5, 8.5, 3.4, 3.6);
    const head = a.layer(ramp);
    head.ellipse(5, 3.6, 2.6, 2.3);
    head.set(3, 0, BASE).set(3, 1, BASE).set(7, 0, BASE).set(7, 1, BASE);
    const tail = a.layer(ramp);
    tail.line(7, 11, 9, 9, LIGHT).set(9, 8, LIGHT);
    a.layer('petal_pink', { outline: false, shading: false }).set(3, 1, LIGHT).set(7, 1, LIGHT);
    return fin(a, 5, 12);
  },
  stone(v) {
    const a = new PixelArt(11, 7);
    const s = a.layer('stone');
    if (v % 3 === 0) s.ellipse(5, 4, 3.5, 2.4);
    else if (v % 3 === 1) { s.ellipse(4, 4, 3, 2.2); a.layer('stone').ellipse(8, 5, 1.8, 1.4); }
    else s.ellipse(5.5, 4.5, 2.2, 1.6);
    return fin(a, 5, 6);
  },
  tuft(v) {
    const a = new PixelArt(11, 10);
    const ramp = ['leaf_deep', 'leaf', 'leaf_sage', 'wa_moos'][v % 4];
    const g = a.layer(ramp, { outline: false, shading: false });
    for (const [tx, ty] of [[1, 3], [3, 0], [5, 1], [8, 2], [9, 5], [4, 3], [2, 6], [7, 5], [6, 0]]) {
      g.line(5, 9, tx, ty, tx < 5 ? LIGHT : BASE);
      g.set(tx, ty, HIGH);
    }
    for (let x = 3; x <= 7; x++) g.set(x, 9, OUTLINE);
    g.set(4, 8, SHADE).set(6, 8, SHADE);
    return fin(a, 5, 9);
  },
  candle(v) {
    // Kerze im Glas/auf Untersetzer; Flamme leuchtet
    const a = new PixelArt(6, 9);
    const c = a.layer(v % 2 ? 'petal_pink' : 'cream');
    c.rect(2, 4, 2, 4);
    a.layer('wood', { shading: false }).rect(1, 8, 4, 1, BASE);
    const f = a.layer('lamp', { outline: false, shading: false, glow: true });
    f.set(2, 2, LIGHT).set(2, 3, BASE).set(3, 3, HIGH).set(2, 1, HIGH);
    return fin(a, 3, 8, { halo: { dx: 0, dy: -6, r: 10, rgb: [255, 196, 110] } });
  },
  teacup(v) {
    const a = new PixelArt(9, 9);
    const ramp = ['petal_white', 'petal_blue', 'petal_pink'][v % 3];
    const cup = a.layer(ramp);
    cup.rect(2, 4, 4, 3);
    cup.set(6, 5, SHADE);
    a.layer(ramp, { shading: false }).rect(1, 7, 6, 1, LIGHT);
    a.layer('soil', { outline: false, shading: false }).set(3, 4, LIGHT).set(4, 4, BASE);
    const steam = a.layer('petal_white', { outline: false, shading: false });
    steam.set(3, 2, HIGH).set(4, 1, LIGHT).set(3, 0, HIGH);
    return fin(a, 4, 8);
  },
  jar(v) {
    const a = new PixelArt(7, 9);
    const g = a.layer('bw_skyblue', { shading: false });
    g.rect(1, 2, 5, 6, LIGHT);
    a.layer(['leaf', 'petal_yellow', 'gh_butternut'][v % 3], { outline: false, shading: false }).rect(2, 4, 3, 3, BASE);
    a.layer('wood', { outline: false }).rect(2, 1, 3, 1, LIGHT);
    a.layer('petal_white', { outline: false, shading: false }).set(2, 3, HIGH);
    return fin(a, 3, 8);
  },
  lantern() {
    const a = new PixelArt(7, 11);
    a.layer('dark', { outline: false, shading: false }).set(3, 0, HIGH).set(3, 1, HIGH);
    const f = a.layer('dark');
    f.rect(1, 3, 5, 6, HIGH);
    f.rect(2, 2, 3, 1, LIGHT);
    const g = a.layer('lamp', { outline: false, shading: false, glow: true });
    g.rect(2, 4, 3, 4, BASE);
    g.set(2, 4, HIGH);
    return fin(a, 3, 10, { halo: { dx: 0, dy: -5, r: 18, rgb: [255, 200, 120] } });
  },
  basket(v) {
    // Hängeampel mit Efeutute; Anker = Haken oben
    const a = new PixelArt(16, 36);
    const ch = a.layer('dark', { outline: false, shading: false });
    ch.line(8, 0, 3, 11, LIGHT).line(8, 0, 13, 11, LIGHT).line(8, 0, 8, 10, HIGH);
    const vine = a.layer('stem', { outline: false, shading: false });
    vine.line(3, 14, 2, 24, SHADE).line(2, 24, 3, 30, SHADE);
    vine.line(12, 14, 13, 22, SHADE).line(13, 22, 12, 34, SHADE);
    vine.line(7, 16, 7, 21, SHADE);
    const pot = a.layer(v % 2 ? 'cream' : 'terracotta');
    pot.rect(3, 12, 10, 2);
    trap(pot, 8, 14, 16, 9, 6);
    const lv = a.layer('leaf');
    for (const [x, y] of [[4, 10], [7, 9], [10, 10], [12, 11], [2, 12], [2, 17], [3, 21], [1, 25], [3, 29], [13, 16], [14, 20], [12, 24], [13, 28], [12, 32], [7, 19]])
      lv.rect(x, y, 2, 2);
    return fin(a, 8, 0);
  },
};

/** Requisit als Sprite (gecacht). */
export function prop(name, v = 0) {
  return sprite(`prop|${name}|${v}`, () => (P[name] ? P[name](v) : null));
}

export const PROP_NAMES = Object.keys(P);

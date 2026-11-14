// Möbel der Pflanzenhandlung und Beete des Gewächshauses als Pixel-Art.
// Gleicher Stil wie die Sprites (tools/sprites): Rampen aus palette.js, Outline
// in der dunkelsten Rampenfarbe, Licht von oben links. Jedes Teil wird einmal
// in ein kleines Canvas gerendert (gecacht) und im Garten nach z sortiert
// zwischen die Pflanzen gezeichnet (siehe layout.js / garden.js).
import { PixelArt, OUTLINE, SHADE, BASE, LIGHT, HIGH } from './pixelart.js';
import { SHOP, BED, INDOOR } from './layout.js';

const cache = new Map();

/** Brett/Platte in 3/4-Ansicht: Oberfläche (s-2..s), Vorderkante (s+1..s+2). */
function slab(l, x0, x1, s, front = 2) {
  for (let x = x0; x <= x1; x++) {
    l.set(x, s - 2, BASE);
    l.set(x, s - 1, LIGHT);
    l.set(x, s, LIGHT);
    l.set(x, s + 1, HIGH);
    for (let k = 2; k <= front; k++) l.set(x, s + k, k === front ? SHADE : BASE);
  }
  // Licht von links: linke Kante etwas heller, rechte dunkler
  l.set(x0, s + 2, BASE).set(x1, s + 1, LIGHT);
}

/** Senkrechter Pfosten, 3 px: links hell, rechts dunkel. */
function post(l, x, y0, y1) {
  for (let y = y0; y <= y1; y++) l.set(x, y, LIGHT).set(x + 1, y, BASE).set(x + 2, y, SHADE);
}

// --- Pflanzenhandlung ----------------------------------------------------------

// Wandregal: Anker = Fußpunkt Mitte (piece.x, piece.y = SHOP.wallFoot)
function shelf(part) {
  const W = 64, H = 74, ax = 32, ay = 72;
  const F = SHOP.wallFoot;
  const s = SHOP.shelfTiers.map((t) => t - F + ay); // lokale Topfböden
  const art = new PixelArt(W, H);
  if (part === 'back') {
    const back = art.layer('wood', { outline: false, shading: false });
    for (let y = s[2] + 1; y <= s[0]; y++)
      for (let x = 5; x <= 58; x++) back.set(x, y, (x - 5) % 9 === 8 ? OUTLINE : SHADE);
    // Schattenkante unter jedem Brett, Lichtkante darüber
    const sh = art.layer('dark', { outline: false, shading: false });
    for (const t of [s[1], s[2]]) for (let x = 5; x <= 58; x++) sh.set(x, t + 3, x % 2 ? BASE : HIGH);
    const posts = art.layer('wood');
    post(posts, 2, s[2] - 1, ay - 1);
    post(posts, 59, s[2] - 1, ay - 1);
    const b = art.layer('wood');
    slab(b, 1, 62, s[0]);
  } else {
    const t = +part.slice(5);
    slab(art.layer('wood'), 1, 62, s[t]);
    if (t === 2) {
      // kleine Zierleiste oben an den Pfosten
      const cap = art.layer('wood', { outline: false, shading: false });
      cap.set(2, s[2] + 3, HIGH).set(61, s[2] + 3, SHADE);
    }
  }
  return { ...art.toCanvas(), ax, ay };
}

// Kommode unter dem Fenster
function sideboard() {
  const W = 60, H = 28, ax = 30, ay = 26;
  const s = ay - SHOP.sideboardH;
  const art = new PixelArt(W, H);
  const body = art.layer('wood');
  for (let y = s + 3; y <= ay - 3; y++)
    for (let x = 5; x <= 54; x++) body.set(x, y, x === 5 ? LIGHT : x === 54 ? SHADE : BASE);
  // Füße
  body.rect(6, ay - 2, 2, 2, SHADE).rect(52, ay - 2, 2, 2, SHADE);
  slab(art.layer('wood'), 3, 56, s);
  // Türen mit Fugen und Griffen
  const det = art.layer('wood', { outline: false, shading: false });
  for (let y = s + 5; y <= ay - 5; y++) det.set(29, y, OUTLINE).set(30, y, LIGHT);
  for (const [x0, x1] of [[8, 26], [33, 51]]) {
    for (let x = x0; x <= x1; x++) det.set(x, s + 5, SHADE).set(x, ay - 5, LIGHT);
    for (let y = s + 5; y <= ay - 5; y++) det.set(x0, y, SHADE).set(x1, y, LIGHT);
  }
  const knob = art.layer('lamp', { outline: false, shading: false });
  knob.set(26 - 2, s + 12, SHADE).set(35, s + 12, SHADE);
  return { ...art.toCanvas(), ax, ay };
}

// Tisch: Platte + 4 Beine
function table() {
  const W = 60, H = 22, ax = 30, ay = 20;
  const s = ay - SHOP.tableH;
  const art = new PixelArt(W, H);
  const backLegs = art.layer('wood', { outline: false, shading: false });
  for (let y = s + 3; y <= ay - 4; y++) backLegs.set(9, y, SHADE).set(10, y, OUTLINE).set(49, y, SHADE).set(50, y, OUTLINE);
  const legs = art.layer('wood');
  post(legs, 4, s + 3, ay - 1);
  post(legs, 53, s + 3, ay - 1);
  // Querstrebe
  const bar = art.layer('wood', { outline: false, shading: false });
  for (let x = 7; x <= 52; x++) bar.set(x, ay - 6, BASE).set(x, ay - 5, SHADE);
  const top = art.layer('wood');
  slab(top, 2, 57, s, 3);
  const grain = art.layer('wood', { outline: false, shading: false });
  for (const [x, y] of [[9, s - 1], [10, s - 1], [24, s], [25, s], [40, s - 1], [41, s - 1], [47, s]]) grain.set(x, y, BASE);
  return { ...art.toCanvas(), ax, ay };
}

// Holzkisten unterschiedlicher Höhe (eine davon gestrichen)
function crates(v) {
  const W = 60, H = 32, ax = 30, ay = 28;
  const art = new PixelArt(W, H);
  const hs = SHOP.crates[v];
  hs.forEach((h, i) => {
    const cx = ax + (i - 1) * 18;
    const x0 = cx - 7, x1 = cx + 7, s = ay - h;
    const ramp = i === (v + 1) % 3 ? 'ph_pot_slate' : 'wood';
    const c = art.layer(ramp);
    for (let y = s + 1; y <= ay - 1; y++)
      for (let x = x0; x <= x1; x++) {
        let t = BASE;
        if ((ay - 1 - y) % 5 === 4) t = SHADE; // Brettfugen
        if (x === x0) t = LIGHT;
        if (x === x1) t = SHADE;
        c.set(x, y, t);
      }
    for (let x = x0; x <= x1; x++) {
      c.set(x, s - 2, BASE);
      c.set(x, s - 1, LIGHT);
      c.set(x, s, LIGHT);
      c.set(x, s + 1, HIGH);
    }
    // Eckleisten
    const e = art.layer(ramp, { outline: false, shading: false });
    for (let y = s + 2; y <= ay - 1; y++) e.set(x0 + 1, y, LIGHT).set(x1 - 1, y, SHADE);
  });
  return { ...art.toCanvas(), ax, ay };
}

// Runder Teppich unter einer Pflanzengruppe
function rug() {
  const W = 60, H = 18, ax = 30, ay = 9;
  const art = new PixelArt(W, H);
  const outer = art.layer('terracotta', { shading: false });
  outer.ellipse(ax, ay, 27, 7.5, BASE);
  const inner = art.layer('cream', { outline: false, shading: false });
  inner.ellipse(ax, ay, 22, 5.5, LIGHT);
  const ring = art.layer('terracotta', { outline: false, shading: false });
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const d = ((x + 0.5 - ax) / 22) ** 2 + ((y + 0.5 - ay) / 5.5) ** 2;
      if (d <= 1 && d > 0.62 && (x + y) % 3 === 0) ring.set(x, y, LIGHT);
    }
  const c = art.layer('cream', { outline: false, shading: false });
  c.ellipse(ax, ay, 9, 2.2, HIGH);
  return { ...art.toCanvas(), ax, ay };
}

// --- Gewächshaus ---------------------------------------------------------------

// Erdbeet mit Holzrand; Anker = Zelle links oben
function bed(v) {
  const { x0, x1, top, front, bottom } = BED;
  const W = INDOOR.gewaechshaus.cellW, H = bottom + 3, ax = 0, ay = 0;
  const art = new PixelArt(W, H);
  // Erde
  const soil = art.layer('gh_earth', { outline: false, shading: false });
  for (let y = top + 2; y <= front - 1; y++)
    for (let x = x0 + 2; x <= x1 - 2; x++) {
      const n = ((x * 73856093) ^ (y * 19349663) ^ (v * 83492791)) >>> 0;
      let t = BASE;
      if (y === top + 2) t = OUTLINE; // Schatten unter dem hinteren Brett
      else if (y === top + 3 || x === x0 + 2) t = SHADE;
      else if (n % 11 === 0) t = LIGHT;
      else if (n % 13 === 0) t = SHADE;
      // Furchen hinter den Pflanzreihen
      for (const r of BED.rows) if (y === r.y + 1 && n % 3) t = SHADE;
      if (y === front - 1) t = SHADE;
      soil.set(x, y, t);
    }
  const rim = art.layer('wood');
  // hinteres Brett (von oben gesehen) und Seitenbretter
  for (let x = x0; x <= x1; x++) rim.set(x, top, LIGHT).set(x, top + 1, BASE);
  for (let y = top; y <= bottom; y++) {
    rim.set(x0, y, LIGHT).set(x0 + 1, y, BASE);
    rim.set(x1 - 1, y, BASE).set(x1, y, SHADE);
  }
  // vorderes Brett: Oberkante + Frontfläche mit Fugen
  for (let x = x0; x <= x1; x++) {
    rim.set(x, front, HIGH).set(x, front + 1, LIGHT);
    for (let y = front + 2; y <= bottom; y++) rim.set(x, y, (y - front) % 3 === 1 ? SHADE : BASE);
  }
  // Eckpfosten
  const posts = art.layer('wood');
  for (const px of [x0, x1 - 2]) {
    for (let y = top - 1; y <= bottom + 1; y++) posts.set(px, y, LIGHT).set(px + 1, y, BASE).set(px + 2, y, SHADE);
    posts.set(px + 1, top - 1, HIGH);
  }
  // Stoßfugen in der Frontfläche (je Beet etwas anders)
  const seam = art.layer('wood', { outline: false, shading: false });
  for (const sx of [x0 + 18 + v * 3, x0 + 38 - v * 2])
    for (let y = front + 2; y <= bottom; y++) seam.set(sx, y, OUTLINE);
  // Schild am Beet (manche Beete)
  if (v === 1 || v === 3) {
    const sign = art.layer('cream');
    const sx = v === 1 ? x0 + 6 : x1 - 10;
    sign.rect(sx, front + 2, 5, 3, LIGHT);
    sign.set(sx + 1, front + 3, SHADE).set(sx + 2, front + 3, SHADE).set(sx + 3, front + 3, BASE);
  }
  return { ...art.toCanvas(), ax, ay };
}

// Gießkanne; Anker = Fußpunkt Mitte
function can(v) {
  const W = 16, H = 12, ax = 7, ay = 10;
  const ramp = v ? 'leaf_deep' : 'petal_white';
  const art = new PixelArt(W, H);
  const spout = art.layer(ramp, { outline: false, shading: false });
  for (let i = 0; i < 4; i++) spout.set(ax + 4 + i, ay - 3 - i, i === 3 ? OUTLINE : BASE);
  spout.set(ax + 8, ay - 7, SHADE).set(ax + 8, ay - 6, OUTLINE);
  const body = art.layer(ramp);
  body.rect(ax - 3, ay - 5, 7, 5);
  const handle = art.layer(ramp, { outline: false, shading: false });
  for (let x = ax - 2; x <= ax + 2; x++) handle.set(x, ay - 8, SHADE);
  handle.set(ax - 3, ay - 7, SHADE).set(ax + 3, ay - 7, SHADE).set(ax - 3, ay - 6, SHADE).set(ax + 3, ay - 6, SHADE);
  const band = art.layer(ramp, { outline: false, shading: false });
  for (let x = ax - 3; x <= ax + 3; x++) band.set(x, ay - 3, SHADE);
  return { ...art.toCanvas(), ax, ay };
}

const BUILD = { shelf: (p) => shelf(p.part), sideboard, table, crates: (p) => crates(p.v || 0), rug, bed: (p) => bed(p.v || 0), can: (p) => can(p.v || 0) };

/** Gerendertes Teil (gecacht) → { img, glow, ax, ay }; gezeichnet bei (x - ax, y - ay). */
export function pieceSprite(p) {
  const key = `${p.kind}|${p.part}|${p.v || 0}`;
  if (!cache.has(key)) {
    const make = BUILD[p.kind];
    cache.set(key, make ? make(p) : null);
  }
  return cache.get(key);
}

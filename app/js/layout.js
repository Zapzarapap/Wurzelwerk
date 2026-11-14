// Garten-Layout: deterministische Poisson-Disc-Verteilung (Best-Candidate)
// mit Zufallszahlen aus der Pflanzen-ID. Rein, ohne Browser-Abhängigkeiten.
import { CONFIG } from './config.js';

/** cyrb53-ähnlicher String-Hash → 32-bit */
export function hashString(str) {
  let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(id, salt = '') {
  return mulberry32(hashString(String(id) + salt));
}

// Region-spezifische Ränder (Welt-Pixel): Fußpunkte der Pflanzen bleiben darin.
// top: Platz für Wand/Glasdach/Baumkronen, damit Sprites (32 px hoch) passen.
export const REGION_MARGINS = {
  pflanzenhandlung: { top: 40 + 20, bottom: 4, side: 12 },
  gewaechshaus: { top: 24 + 22, bottom: 4, side: 12 },
  blumenwiese: { top: 26, bottom: 4, side: 10 },
  wald: { top: 34 + 22, bottom: 4, side: 12 },
};

/** Weltgröße für n Pflanzen. Wächst in Stufen, damit Positionen stabil bleiben. */
export function worldSize(n, region, cfg = CONFIG.garden) {
  const mg = REGION_MARGINS[region] || REGION_MARGINS.blumenwiese;
  let level = 0;
  for (;;) {
    const W = cfg.baseWidth + cfg.widthStep * level;
    const H = Math.round((W * cfg.aspect) / 8) * 8;
    const usable = (W - 2 * mg.side) * (H - mg.top - mg.bottom);
    if (usable >= n * cfg.areaPerPlant || level > 200) return { W, H, level };
    level++;
  }
}

function chronological(plants) {
  return [...plants].sort((a, b) => (a.createdAt - b.createdAt) || (a.id < b.id ? -1 : 1));
}

/**
 * plants: [{id, createdAt}] – wird chronologisch platziert.
 * → { W, H, region, items: [{plant, x, y, flip, z}], pieces: [...] }
 *   x/y = Fußpunkt (Topfboden bzw. Erdpunkt), z = Zeichenreihenfolge;
 *   items und pieces sind nach z sortiert (hinten → vorne).
 * Pflanzenhandlung und Gewächshaus stellen auf Möbel bzw. in Beete
 * (siehe furnitureLayout), Blumenwiese und Wald frei per Poisson-Disc.
 */
export function layoutGarden(plants, region, cfg = CONFIG.garden, fill = null) {
  if (INDOOR[region]) return furnitureLayout(plants, region, fill);
  const sorted = chronological(plants);
  const { W, H } = worldSize(sorted.length, region, cfg);
  const mg = REGION_MARGINS[region] || REGION_MARGINS.blumenwiese;
  const x0 = mg.side, x1 = W - mg.side, y0 = mg.top, y1 = H - mg.bottom;

  // Raster für schnelle Nachbarsuche
  const cell = cfg.minDist;
  const gw = Math.ceil(W / cell) + 1, gh = Math.ceil(H / cell) + 1;
  const grid = new Array(gw * gh);
  const placed = [];

  function nearestSq(x, y, limit) {
    // Abstand zum nächsten Punkt (gestreckt in y, weil Sprites breiter als tief wirken)
    let best = limit * limit;
    const r = Math.ceil(limit / cell);
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    for (let j = cy - r; j <= cy + r; j++) {
      if (j < 0 || j >= gh) continue;
      for (let i = cx - r; i <= cx + r; i++) {
        if (i < 0 || i >= gw) continue;
        const list = grid[j * gw + i];
        if (!list) continue;
        for (const p of list) {
          const dx = p.x - x, dy = (p.y - y) * 1.25;
          const d = dx * dx + dy * dy;
          if (d < best) best = d;
        }
      }
    }
    return best;
  }

  const items = [];
  const searchR = cfg.minDist * 4;
  for (const plant of sorted) {
    const rnd = rngFor(plant.id);
    const flip = rnd() < 0.5;
    let bx = 0, by = 0, bd = -1;
    const k = cfg.candidates;
    for (let c = 0; c < k; c++) {
      const x = x0 + rnd() * (x1 - x0);
      const y = y0 + rnd() * (y1 - y0);
      const d = nearestSq(x, y, searchR);
      if (d > bd) { bd = d; bx = x; by = y; }
    }
    const x = Math.round(bx), y = Math.round(by);
    const p = { x, y };
    const gi = Math.floor(y / cell) * gw + Math.floor(x / cell);
    (grid[gi] ||= []).push(p);
    placed.push(p);
    items.push({ plant, x, y, flip, z: y });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  return fillOutdoor({ W, H, region, items, pieces: [] }, fill);
}

/**
 * Füllfläche (Blumenwiese/Wald): Die Welt wird auf mindestens fill.W × fill.H
 * erweitert, damit sie den Bildschirm ganz ausfüllt. Pflanzen werden nur
 * verschoben (zentriert), nie neu verteilt.
 */
export function fillOutdoor(layout, fill) {
  if (!fill) return layout;
  const W = Math.max(layout.W, Math.ceil(fill.W)), H = Math.max(layout.H, Math.ceil(fill.H));
  const dx = Math.floor((W - layout.W) / 2), dy = Math.floor((H - layout.H) / 2);
  if (dx || dy) for (const it of layout.items) { it.x += dx; it.y += dy; it.z = it.y; }
  return { ...layout, W, H, baseW: layout.W, baseH: layout.H };
}

/** Kleinster Abstand zwischen platzierten Punkten (für Tests). */
export function minDistance(items) {
  let best = Infinity;
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const d = Math.hypot(items[i].x - items[j].x, items[i].y - items[j].y);
      if (d < best) best = d;
    }
  return best;
}

// --- Innenräume: Möbel (Pflanzenhandlung) und Beete (Gewächshaus) -----------
//
// Der Raum besteht aus einem Raster von Zellen (cellW breit). Jede Zelle trägt
// ein Möbelstück bzw. Beet mit festen Stellplätzen. Die Pflanzen werden
// chronologisch auf einen zufälligen freien Platz gestellt (Zufall aus der
// Pflanzen-ID). Erst wenn alle Plätze belegt sind, wächst der Raum um eine
// Spalte oder Reihe (je nach Seitenverhältnis). Weil Zellen nur rechts/unten
// angefügt werden und der Platz einer Pflanze nur von den Pflanzen *vor* ihr
// abhängt, ziehen bestehende Pflanzen beim Wachsen nie um.
//
// Pflanzenhandlung: Reihe 0 ist die Rückwand (abwechselnd Wandregal und Fenster
// mit Fensterbank + Kommode), darunter Bodenreihen (Tisch, Kisten, Teppich).
// Gewächshaus: Reihen von Erdbeeten mit Holzrand, Kieswege dazwischen.

export const INDOOR = {
  pflanzenhandlung: { cellW: 64, side: 8, top: 110, rowH: 44, bottom: 4, start: [2, 1], aspect: 1.4 },
  gewaechshaus: { cellW: 64, side: 8, top: 40, rowH: 42, bottom: 4, start: [2, 2], aspect: 1.4 },
};

// Pflanzenhandlung: Maße der Möbel (Welt-Pixel, relativ zur Zellmitte/Bodenlinie)
export const SHOP = {
  wallH: 100, // Wand bis hier, darunter Dielen
  wallFoot: 106, // Standlinie der Wandmöbel
  shelfTiers: [102, 70, 38], // Topfböden der drei Regalböden (unten → oben)
  shelfDx: [-17, 0, 17],
  sillY: 56, // Topfboden auf der Fensterbank
  sillDx: [-10, 10],
  sideboardH: 22,
  tableH: 16,
  crates: [[12, 20, 6], [20, 10, 14], [8, 16, 22], [14, 6, 18]],
};

// Gewächshaus: Beet in Zellkoordinaten (links oben = 0,0)
export const BED = {
  x0: 3, x1: 60, // Außenkante Holzrand
  top: 6, // Oberkante hinterer Rand
  front: 25, // Oberkante vorderes Brett
  bottom: 31, // Unterkante Frontbrett
  rows: [
    { y: 15, xs: [14, 32, 50] },
    { y: 23, xs: [23, 41] },
  ],
};

export function roomSize(region, C, R) {
  const d = INDOOR[region];
  return { W: 2 * d.side + C * d.cellW, H: d.top + R * d.rowH + d.bottom };
}

/** Zeilenindizes, die ein Raum mit R (Boden-/Beet-)Reihen hat. */
function rowIndices(region, R) {
  return region === 'pflanzenhandlung'
    ? Array.from({ length: R + 1 }, (_, i) => i) // 0 = Wand
    : Array.from({ length: R }, (_, i) => i);
}

function cellRnd(region, c, r) {
  return mulberry32(hashString(`${region}:${c}:${r}`));
}

/** Bodenmöbel-Typ einer Zelle (deterministisch, Nachbarn möglichst verschieden). */
export function floorKind(c, r) {
  const pick = (cc) => {
    const v = cellRnd('pflanzenhandlung', cc, r)();
    return v < 0.45 ? 'table' : v < 0.75 ? 'crates' : 'rug';
  };
  let k = pick(c);
  if (c > 0 && k === floorKind(c - 1, r)) {
    const v = cellRnd('pflanzenhandlung', c, r + 1000)();
    k = ['table', 'crates', 'rug'].filter((x) => x !== k)[v < 0.6 ? 0 : 1];
  }
  return k;
}

/**
 * Eine Zelle → { parts: [{kind, part, x, y, z, v}], slots: [{x, y, z, key, jitter}], wall? }
 * parts sind Zeichenteile der Möbel (scenery.js zeichnet sie), z = Reihenfolge.
 */
export function makeCell(region, c, r) {
  const d = INDOOR[region];
  const x0 = d.side + c * d.cellW, cx = x0 + d.cellW / 2;
  const parts = [], slots = [];
  const slot = (x, y, z, jitter = 0, on = '') => slots.push({ x, y, z, key: `${c},${r},${slots.length}`, jitter, on });
  if (region === 'gewaechshaus') {
    const yT = d.top + r * d.rowH;
    parts.push({ kind: 'bed', part: 'body', x: x0, y: yT, z: yT + BED.top, v: (c * 7 + r * 3) % 4 });
    for (const row of BED.rows) for (const sx of row.xs) slot(x0 + sx, yT + row.y, yT + row.y, 1, 'bed');
    // ab und zu eine Gießkanne im Weg unter dem Beet
    const rr = cellRnd(region, c, r);
    if (rr() < 0.28) {
      const gx = x0 + 8 + Math.floor(rr() * 46), gy = yT + d.rowH - 2;
      parts.push({ kind: 'can', part: 'body', x: gx, y: gy, z: gy, v: rr() < 0.5 ? 0 : 1 });
    }
    return { parts, slots };
  }
  // Pflanzenhandlung
  if (r === 0) {
    const kind = c % 2 === 0 ? 'shelf' : 'window';
    const F = SHOP.wallFoot;
    if (kind === 'shelf') {
      parts.push({ kind: 'shelf', part: 'back', x: cx, y: F, z: F });
      SHOP.shelfTiers.forEach((s, t) => {
        if (t > 0) parts.push({ kind: 'shelf', part: 'board' + t, x: cx, y: F, z: F + 0.2 * t });
        for (const dx of SHOP.shelfDx) slot(cx + dx, s, F + 0.1 + 0.2 * t, 0, 'shelf');
      });
    } else {
      for (const dx of SHOP.sillDx) slot(cx + dx, SHOP.sillY, SHOP.wallH - 4, 0, 'sill');
      parts.push({ kind: 'sideboard', part: 'body', x: cx, y: F, z: F });
      for (const dx of SHOP.shelfDx) slot(cx + dx, F - SHOP.sideboardH, F + 0.1, 0, 'sideboard');
    }
    return { parts, slots, wall: { kind, x0, cx } };
  }
  const yT = d.top + (r - 1) * d.rowH, gy = yT + d.rowH - 6;
  const kind = floorKind(c, r);
  if (kind === 'table') {
    parts.push({ kind: 'table', part: 'body', x: cx, y: gy, z: gy });
    for (const dx of [-18, 0, 18]) slot(cx + dx, gy - SHOP.tableH, gy + 0.1, 0, 'table');
  } else if (kind === 'crates') {
    const v = Math.floor(cellRnd(region, c, r + 500)() * SHOP.crates.length);
    parts.push({ kind: 'crates', part: 'body', x: cx, y: gy, z: gy, v });
    SHOP.crates[v].forEach((h, i) => slot(cx + (i - 1) * 18, gy - h, gy + 0.1, 0, 'crate'));
  } else {
    parts.push({ kind: 'rug', part: 'body', x: cx, y: gy - 5, z: yT });
    slot(cx - 14, gy - 11, gy - 11, 1, 'rug');
    slot(cx + 13, gy - 9, gy - 9, 1, 'rug');
    slot(cx, gy + 1, gy + 1, 1, 'rug');
  }
  return { parts, slots };
}

/**
 * Möbel-/Beet-Layout, siehe Kommentar oben.
 * fill = {W, H}: Nach dem Platzieren werden leere Reihen/Spalten angefügt
 * (und zuletzt Boden), bis der Raum diese Fläche ausfüllt. Die Plätze der
 * Pflanzen hängen davon nicht ab.
 */
export function furnitureLayout(plants, region, fill = null) {
  const d = INDOOR[region];
  const sorted = chronological(plants);
  let C = 0, R = d.start[1];
  const pieces = [], walls = [], open = [];
  let total = 0;
  const addCell = (c, r) => {
    const cell = makeCell(region, c, r);
    pieces.push(...cell.parts);
    open.push(...cell.slots);
    total += cell.slots.length;
    if (cell.wall) walls.push(cell.wall);
  };
  const addColumn = () => {
    for (const r of rowIndices(region, R)) addCell(C, r);
    C++;
  };
  const addRow = () => {
    const r = region === 'pflanzenhandlung' ? R + 1 : R;
    R++;
    for (let c = 0; c < C; c++) addCell(c, r);
  };
  while (C < d.start[0]) addColumn();
  const grow = () => {
    const { W, H } = roomSize(region, C, R);
    if (H / W > d.aspect) addColumn();
    else addRow();
  };

  const items = [];
  for (const plant of sorted) {
    while (!open.length) grow();
    const rnd = rngFor(plant.id);
    const flip = rnd() < 0.5;
    const s = open.splice(Math.floor(rnd() * open.length), 1)[0];
    let x = s.x, y = s.y;
    if (s.jitter) {
      x += Math.round((rnd() - 0.5) * 2 * s.jitter * 1.5);
      y += Math.round((rnd() - 0.5) * 2 * s.jitter);
    }
    items.push({ plant, x, y, flip, z: s.z + (y - s.y) * 0.01, slot: s.key });
  }
  const base = roomSize(region, C, R);
  if (fill) {
    while (roomSize(region, C, R).H + d.rowH <= fill.H) addRow();
    while (roomSize(region, C, R).W + d.cellW <= fill.W) addColumn();
  }
  const room = roomSize(region, C, R);
  const W = fill ? Math.max(room.W, Math.ceil(fill.W)) : room.W;
  const H = fill ? Math.max(room.H, Math.ceil(fill.H)) : room.H;
  items.sort((a, b) => a.z - b.z || a.x - b.x);
  pieces.sort((a, b) => a.z - b.z || a.x - b.x);
  // free: noch freie Stellplätze (für Deko, die einer Pflanze sofort Platz macht)
  return { W, H, region, items, pieces, walls, cols: C, rows: R, capacity: total, free: open, baseW: base.W, baseH: base.H };
}

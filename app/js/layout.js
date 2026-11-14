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

/**
 * plants: [{id, createdAt}] – wird chronologisch platziert.
 * → { W, H, items: [{plant, x, y, flip}] } (x/y = Fußpunkt, sortiert nach y)
 */
export function layoutGarden(plants, region, cfg = CONFIG.garden) {
  const sorted = [...plants].sort((a, b) => (a.createdAt - b.createdAt) || (a.id < b.id ? -1 : 1));
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
    items.push({ plant, x, y, flip });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  return { W, H, items };
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

// Seed-Zufall (rein, ohne DOM). Alle Szenen nutzen nur diese Funktionen, damit
// Stellplätze und Deko auf jedem Gerät exakt gleich ausfallen.

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

/** Zufallsfolge aus einem beliebigen Schlüssel (z. B. Pflanzen-ID + Salz). */
export function rngFor(id, salt = '') {
  return mulberry32(hashString(String(id) + salt));
}

/** Kurzform: rng('wald:stein:3:4') */
export const rng = (key) => mulberry32(hashString(String(key)));

/** Ganzzahl-Rauschen 0..1 pro Pixel (schnell, für Texturen). */
export function noise(x, y, seed = 0) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Element aus einer Liste. */
export function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length) % list.length];
}

/** Gewichtete Wahl: list = [[gewicht, wert], ...] */
export function weighted(rnd, list) {
  let u = rnd() * list.reduce((a, [w]) => a + w, 0);
  for (const [w, v] of list) if ((u -= w) <= 0) return v;
  return list[list.length - 1][1];
}

/** Ganzzahl in [a, b] */
export function int(rnd, a, b) {
  return a + Math.floor(rnd() * (b - a + 1));
}

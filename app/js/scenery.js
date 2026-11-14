// Einfache, prozedurale Hintergründe je Region (Welt-Pixel, 1×).
// Wird später durch gezeichnete Kacheln ersetzt/verschönert.
import { makeCanvas } from './pixelart.js';
import { RAMPS, hexToRgb } from './palette.js';
import { mulberry32, hashString } from './layout.js';

const C = Object.fromEntries(Object.entries(RAMPS).map(([k, v]) => [k, v.map(hexToRgb)]));
const PLASTER = [[120, 92, 70], [196, 166, 128], [224, 200, 162], [236, 216, 182], [246, 234, 210]];
const GRAVEL = [[120, 104, 84], [168, 150, 120], [196, 180, 150], [214, 200, 172]];

function noise(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

class Buf {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.c = makeCanvas(W, H);
    this.ctx = this.c.getContext('2d');
    this.img = this.ctx.createImageData(W, H);
  }
  set(x, y, rgb, a = 255) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const i = (y * this.W + x) * 4, d = this.img.data;
    d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a;
  }
  rect(x, y, w, h, rgb) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, rgb);
  }
  flush() {
    this.ctx.putImageData(this.img, 0, 0);
    return this.c;
  }
}

/**
 * → { canvas, glow (canvas), halos: [{x,y,r,rgb}], windows: [{x,y,w,h}], fireflies: [{x,y}], outside: [r,g,b] }
 */
export function drawGround(region, W, H) {
  const seed = hashString(region);
  const rnd = mulberry32(seed ^ W ^ (H << 8));
  const b = new Buf(W, H);
  const glow = makeCanvas(W, H);
  const g = glow.getContext('2d');
  const out = { halos: [], windows: [], fireflies: [], outside: [60, 46, 40] };

  if (region === 'pflanzenhandlung') {
    const wallH = 40;
    // Holzboden: Dielen 6 px, versetzte Stöße
    for (let y = wallH; y < H; y++) {
      const row = Math.floor((y - wallH) / 6);
      const off = (row * 37) % 53;
      for (let x = 0; x < W; x++) {
        const n = noise(x >> 2, y, seed + row);
        let col = C.wood[(row % 3 === 0) ? 3 : 2];
        if (n > 0.82) col = C.wood[(row % 3 === 0) ? 2 : 1];
        if ((y - wallH) % 6 === 5) col = C.wood[1];
        if ((x + off) % 53 === 0) col = C.wood[1];
        b.set(x, y, col);
      }
    }
    // Wand
    for (let y = 0; y < wallH; y++)
      for (let x = 0; x < W; x++) b.set(x, y, noise(x, y, seed) > 0.9 ? PLASTER[3] : PLASTER[2]);
    b.rect(0, wallH - 4, W, 3, C.wood[2]);
    b.rect(0, wallH - 4, W, 1, C.wood[3]);
    b.rect(0, wallH - 1, W, 1, C.wood[0]);
    // Fenster und Lampen im Wechsel
    const n = Math.max(1, Math.floor(W / 64));
    const step = W / n;
    for (let i = 0; i < n; i++) {
      const cx = Math.round(step * (i + 0.5));
      const w = 26, h = 22, x = cx - w / 2, y = 6;
      b.rect(x - 2, y - 2, w + 4, h + 4, C.wood[1]);
      b.rect(x - 1, y - 1, w + 2, h + 2, C.wood[3]);
      out.windows.push({ x, y, w, h, bars: true });
      b.rect(x - 3, y + h + 1, w + 6, 2, C.wood[2]); // Fensterbrett
      // Lampe zwischen den Fenstern
      if (i < n - 1 || n === 1) {
        const lx = n === 1 ? Math.min(W - 10, cx + 26) : Math.round(step * (i + 1));
        b.rect(lx, 0, 1, 10, C.dark[2]);
        b.rect(lx - 3, 10, 7, 2, C.leaf_deep[1]);
        b.rect(lx - 4, 12, 9, 1, C.leaf_deep[0]);
        g.fillStyle = RAMPS.lamp[2];
        g.fillRect(lx - 1, 13, 3, 1);
        b.rect(lx - 1, 13, 3, 1, C.lamp[1]);
        out.halos.push({ x: lx + 0.5, y: 16, r: 26, rgb: [255, 200, 120] });
      }
    }
    // Lichterkette an der Wandleiste
    for (let x = 4; x < W; x += 7) {
      const y = wallH - 6 + Math.round(Math.sin(x / 7) * 1.2);
      b.set(x, y, C.lamp[1]);
      g.fillStyle = ['#ffd27a', '#ffb0a0', '#bfe8ff'][(x / 7) % 3 | 0];
      g.fillRect(x, y, 1, 1);
      if (x % 21 === 4) out.halos.push({ x, y, r: 8, rgb: [255, 210, 150] });
    }
    out.outside = [70, 48, 34];
  } else if (region === 'gewaechshaus') {
    const roofH = 24;
    // Beet-Erde mit Furchen
    for (let y = roofH; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x, y, seed);
        let col = n > 0.7 ? C.soil[3] : C.soil[2];
        if ((y - roofH) % 10 === 0) col = C.soil[1];
        if ((y - roofH) % 10 === 1) col = n > 0.5 ? C.soil[4] : C.soil[3];
        b.set(x, y, col);
      }
    // Kiesweg am Rand + Holzrahmen
    for (let y = roofH; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (x < 5 || x >= W - 5 || y >= H - 3) b.set(x, y, GRAVEL[1 + Math.floor(noise(x, y, seed + 1) * 3)]);
        else if (x === 5 || x === W - 6 || y === H - 4) b.set(x, y, C.wood[2]);
      }
    b.rect(0, roofH, W, 2, C.wood[1]);
    // Glasdach
    b.rect(0, 0, W, roofH, [220, 228, 226]);
    out.windows.push({ x: 0, y: 0, w: W, h: roofH - 1, bars: false });
    const panes = Math.max(2, Math.round(W / 22));
    for (let i = 0; i <= panes; i++) {
      const x = Math.round((i * (W - 1)) / panes);
      out.windows.push({ frame: true, x, y: 0, w: 1, h: roofH });
    }
    out.windows.push({ frame: true, x: 0, y: 11, w: W, h: 1 });
    // Laternen
    for (let x = 18; x < W - 8; x += 56) {
      b.rect(x, roofH - 2, 1, 6, C.dark[2]);
      b.rect(x - 2, roofH + 4, 5, 5, C.dark[2]);
      b.rect(x - 1, roofH + 5, 3, 3, C.lamp[1]);
      g.fillStyle = RAMPS.lamp[3];
      g.fillRect(x - 1, roofH + 5, 3, 3);
      out.halos.push({ x: x + 0.5, y: roofH + 7, r: 24, rgb: [255, 196, 110] });
    }
    out.outside = [52, 40, 34];
  } else if (region === 'wald') {
    // Waldboden: Erde/Moos, Laub
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x >> 1, y >> 1, seed), n2 = noise(x, y, seed + 7);
        const moss = noise(x >> 4, y >> 4, seed + 3) > 0.45;
        let col = moss ? (n > 0.6 ? C.moss[2] : C.moss[1]) : n > 0.55 ? C.soil[3] : C.soil[2];
        if (n2 > 0.97) col = C.petal_orange[1];
        else if (n2 > 0.95) col = C.wood[3];
        b.set(x, y, col);
      }
    // Baumreihe oben: Stämme + Kronen
    const trees = Math.max(2, Math.round(W / 34));
    for (let i = 0; i < trees; i++) {
      const tx = Math.round(((i + 0.5) * W) / trees + (rnd() - 0.5) * 10);
      const tw = 6 + Math.floor(rnd() * 3);
      for (let y = 8; y < 40; y++) for (let x = tx - tw / 2; x < tx + tw / 2; x++) {
        const xx = Math.round(x);
        b.set(xx, y, xx === Math.round(tx - tw / 2) ? C.wood[0] : xx < tx ? C.wood[2] : C.wood[1]);
      }
      b.rect(Math.round(tx - tw / 2) - 2, 38, tw + 4, 2, C.wood[1]); // Wurzeln
    }
    for (let y = 0; y < 26; y++)
      for (let x = 0; x < W; x++) {
        const edge = 18 + Math.sin(x / 6 + seed) * 3 + Math.sin(x / 2.3) * 2;
        if (y < edge) {
          const n = noise(x >> 1, y >> 1, seed + 11);
          b.set(x, y, n > 0.7 ? C.leaf_deep[2] : n > 0.3 ? C.leaf_deep[1] : C.leaf_deep[0]);
        } else if (y < edge + 1) b.set(x, y, C.leaf_deep[0]);
      }
    // Leuchtende Moospunkte
    for (let i = 0; i < Math.round((W * H) / 2600); i++) {
      const x = Math.floor(rnd() * W), y = 44 + Math.floor(rnd() * (H - 48));
      b.set(x, y, C.glow[2]);
      g.fillStyle = RAMPS.glow[3];
      g.fillRect(x, y, 1, 1);
      out.halos.push({ x, y, r: 6, rgb: [140, 240, 190] });
    }
    out.outside = [28, 36, 26];
  } else {
    // Blumenwiese
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x >> 1, y, seed), big = noise(x >> 3, y >> 3, seed + 5);
        let col = big > 0.5 ? C.leaf[2] : C.leaf[2].map((v, k) => Math.round((v + C.moss[2][k]) / 2));
        if (n > 0.86) col = C.leaf[3];
        else if (n < 0.06) col = C.leaf[1];
        b.set(x, y, col);
      }
    // Grasbüschel und Streublumen
    for (let i = 0; i < Math.round((W * H) / 90); i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      b.set(x, y, C.leaf[4]);
      b.set(x, y + 1, C.leaf[3]);
      if (rnd() < 0.5) b.set(x + 1, y + 1, C.leaf[1]);
    }
    const dots = [C.petal_white[3], C.petal_yellow[3], C.petal_pink[3], C.petal_blue[3]];
    for (let i = 0; i < Math.round((W * H) / 700); i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      b.set(x, y, dots[Math.floor(rnd() * dots.length)]);
    }
    for (let i = 0; i < Math.max(6, Math.round((W * H) / 1800)); i++)
      out.fireflies.push({ x: Math.floor(rnd() * W), y: 6 + Math.floor(rnd() * (H - 10)), p: rnd() * Math.PI * 2 });
    out.outside = [40, 70, 42];
  }

  out.canvas = b.flush();
  out.glow = glow;
  return out;
}

/** Himmel in die Fenster zeichnen (nach dem Grading). */
export function drawSky(ctx, scene, light, seed = 1) {
  const [r, g, bl] = light.sky;
  const top = `rgb(${Math.round(r * 0.8)},${Math.round(g * 0.85)},${Math.round(bl * 0.95)})`;
  const bottom = `rgb(${r},${g},${bl})`;
  for (const w of scene.windows) {
    if (w.frame) continue;
    const half = Math.ceil(w.h / 2);
    ctx.fillStyle = top;
    ctx.fillRect(w.x, w.y, w.w, half);
    ctx.fillStyle = bottom;
    ctx.fillRect(w.x, w.y + half, w.w, w.h - half);
    if (light.glow > 0.6) {
      // Sterne
      const rnd = mulberry32(seed + w.x * 31 + w.y);
      ctx.fillStyle = `rgba(255,248,220,${(light.glow - 0.6) * 2.2})`;
      for (let i = 0; i < Math.max(2, (w.w * w.h) / 70); i++) ctx.fillRect(w.x + Math.floor(rnd() * w.w), w.y + Math.floor(rnd() * w.h), 1, 1);
    } else if (light.glow < 0.3) {
      // kleine Wolke
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const cx = w.x + Math.floor(w.w * 0.3), cy = w.y + Math.floor(w.h * 0.35);
      ctx.fillRect(cx, cy, 6, 2);
      ctx.fillRect(cx + 2, cy - 1, 3, 1);
    }
    if (w.bars) {
      // Fensterkreuz
      const shade = light.glow > 0.5 ? '#3a2418' : '#a87a52';
      ctx.fillStyle = shade;
      ctx.fillRect(w.x + Math.floor(w.w / 2), w.y, 1, w.h);
      ctx.fillRect(w.x, w.y + Math.floor(w.h / 2), w.w, 1);
    }
  }
  ctx.fillStyle = light.glow > 0.5 ? '#5a6266' : '#c8d2d0';
  for (const w of scene.windows) if (w.frame) ctx.fillRect(w.x, w.y, w.w, w.h);
}

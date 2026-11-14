// Einfache, prozedurale Hintergründe je Region (Welt-Pixel, 1×).
// Pflanzenhandlung/Gewächshaus: Wände, Fenster, Böden; die Möbel und Beete
// selbst kommen aus furniture.js (z-sortiert zwischen den Pflanzen).
import { makeCanvas } from './pixelart.js';
import { RAMPS, hexToRgb } from './palette.js';
import { mulberry32, hashString, SHOP, INDOOR } from './layout.js';
import { fenceArt, benchArt, lanternArt, treeArt } from './decor.js';

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
export function drawGround(region, W, H, layout = null) {
  const seed = hashString(region);
  const rnd = mulberry32(seed ^ W ^ (H << 8));
  const b = new Buf(W, H);
  const glow = makeCanvas(W, H);
  const g = glow.getContext('2d');
  const out = { halos: [], windows: [], fireflies: [], critters: [], moonbeams: null, outside: [60, 46, 40] };
  const after = []; // Rand-Deko (PixelArt), wird nach flush() gezeichnet: [art, x, y]

  if (region === 'pflanzenhandlung') {
    const wallH = SHOP.wallH;
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
    // Wand: Putz oben, Holzvertäfelung unten, Fußleiste
    const panelY = 70;
    for (let y = 0; y < wallH; y++)
      for (let x = 0; x < W; x++) {
        if (y < panelY) b.set(x, y, noise(x, y, seed) > 0.9 ? PLASTER[3] : PLASTER[2]);
        else {
          const k = x % 8;
          b.set(x, y, k === 0 ? C.wood[1] : k === 1 ? C.wood[3] : noise(x, y >> 2, seed + 9) > 0.85 ? C.wood[3] : C.wood[2]);
        }
      }
    b.rect(0, 0, W, 2, C.wood[1]); // Deckenbalken
    b.rect(0, 2, W, 1, C.wood[0]);
    b.rect(0, panelY - 2, W, 2, C.wood[3]); // Abschlussleiste der Vertäfelung
    b.rect(0, panelY - 2, W, 1, C.wood[4]);
    b.rect(0, panelY, W, 1, C.wood[0]);
    b.rect(0, wallH - 4, W, 3, C.wood[2]); // Fußleiste
    b.rect(0, wallH - 4, W, 1, C.wood[3]);
    b.rect(0, wallH - 1, W, 1, C.wood[0]);
    const walls = layout?.walls || [];
    for (const w of walls) {
      if (w.kind === 'shelf') {
        // Wandschatten hinter dem Regal (rechts unten versetzt)
        for (let y = 36; y < wallH; y++) b.set(w.cx + 31, y, y < panelY ? PLASTER[1] : C.wood[1]);
        continue;
      }
      // Fenster mit Bank
      const ww = 28, wh = 32, x = w.cx - ww / 2, y = 18;
      b.rect(x - 3, y - 3, ww + 6, wh + 6, C.wood[0]);
      b.rect(x - 2, y - 2, ww + 4, wh + 4, C.wood[3]);
      b.rect(x - 2, y - 2, ww + 4, 1, C.wood[4]);
      b.rect(x - 1, y - 1, ww + 2, wh + 2, C.wood[1]);
      out.windows.push({ x, y, w: ww, h: wh, bars: true });
      // Fensterbank: Oberfläche, Kante, Schatten
      const sy = SHOP.sillY;
      b.rect(x - 6, sy - 3, ww + 12, 1, C.wood[0]);
      b.rect(x - 5, sy - 2, ww + 10, 1, C.wood[2]);
      b.rect(x - 5, sy - 1, ww + 10, 2, C.wood[3]);
      b.rect(x - 5, sy + 1, ww + 10, 1, C.wood[4]);
      b.rect(x - 5, sy + 2, ww + 10, 1, C.wood[1]);
      b.rect(x - 6, sy + 3, ww + 12, 1, C.wood[0]);
      b.set(x - 6, sy - 2, C.wood[0]); b.set(x - 6, sy - 1, C.wood[0]); b.set(x - 6, sy, C.wood[0]); b.set(x - 6, sy + 1, C.wood[0]); b.set(x - 6, sy + 2, C.wood[0]);
      b.set(x + ww + 5, sy - 2, C.wood[0]); b.set(x + ww + 5, sy - 1, C.wood[0]); b.set(x + ww + 5, sy, C.wood[0]); b.set(x + ww + 5, sy + 1, C.wood[0]); b.set(x + ww + 5, sy + 2, C.wood[0]);
      b.rect(x - 4, sy + 4, ww + 8, 1, PLASTER[1]);
      // Hängelampe über dem Fenster
      const lx = w.cx;
      b.rect(lx, 3, 1, 6, C.dark[2]);
      b.rect(lx - 3, 9, 7, 1, C.leaf_deep[0]);
      b.rect(lx - 3, 10, 7, 1, C.leaf_deep[2]);
      b.rect(lx - 4, 11, 9, 1, C.leaf_deep[0]);
      b.set(lx - 2, 10, C.leaf_deep[3]);
      g.fillStyle = RAMPS.lamp[2];
      g.fillRect(lx - 1, 12, 3, 1);
      b.rect(lx - 1, 12, 3, 1, C.lamp[1]);
      out.halos.push({ x: lx + 0.5, y: 15, r: 28, rgb: [255, 200, 120] });
    }
    // Lichterkette unter der Decke, durchhängend zwischen Haken
    const span = 32;
    for (let x = 1; x < W - 1; x++) {
      const t = (x % span) / span;
      const y = 4 + Math.round(Math.sin(t * Math.PI) * 3);
      b.set(x, y, C.dark[3]);
      if (x % span === 0) { b.set(x, 3, C.dark[2]); b.set(x, 4, C.dark[2]); }
      if (x % 6 === 3) {
        const cols = ['#ffd27a', '#ffb0a0', '#bfe8ff'];
        b.set(x, y + 1, C.lamp[1]);
        g.fillStyle = cols[(x / 6 | 0) % 3];
        g.fillRect(x, y + 1, 1, 1);
        if (x % 18 === 3) out.halos.push({ x, y: y + 1, r: 8, rgb: [255, 210, 150] });
      }
    }
    out.outside = [70, 48, 34];
  } else if (region === 'gewaechshaus') {
    const top = INDOOR.gewaechshaus.top;
    const glassH = 27, knee = top - 3;
    // Kiesboden überall (Wege), Beete kommen als Möbel darüber
    for (let y = knee; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = noise(x, y, seed + 1), n2 = noise(x >> 2, y >> 2, seed + 4);
        let col = GRAVEL[n2 > 0.72 ? 1 : 2];
        if (n > 0.93) col = GRAVEL[3];
        else if (n < 0.04) col = GRAVEL[0];
        else if (n < 0.12) col = GRAVEL[1];
        b.set(x, y, col);
      }
    // Trittplatten in den Wegen zwischen den Beetreihen
    const d = INDOOR.gewaechshaus;
    for (let r = 0; r * d.rowH + top < H - 8; r++) {
      const py = top + r * d.rowH + d.rowH - 6;
      for (let x = 10 + (r % 2) * 9; x < W - 12; x += 19) {
        if (noise(x, r, seed + 2) < 0.35) continue;
        for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
          const edge = j === 3 || i === 7 ? 1 : j === 0 || i === 0 ? 3 : 2;
          if ((i === 0 || i === 7) && (j === 0 || j === 3)) continue;
          b.set(x + i, py + j, edge === 3 ? PLASTER[3] : edge === 1 ? GRAVEL[0] : PLASTER[2]);
        }
      }
    }
    // Sockel aus Ziegeln unter der Glaswand
    for (let y = glassH; y < knee; y++)
      for (let x = 0; x < W; x++) {
        const row = y - glassH;
        const off = (row >> 2) % 2 ? 4 : 0;
        let col = C.terracotta[2];
        if (row % 4 === 3 || (x + off) % 8 === 0) col = C.terracotta[1];
        else if (noise(x, y, seed + 6) > 0.8) col = C.terracotta[3];
        b.set(x, y, col);
      }
    b.rect(0, glassH, W, 1, C.wood[3]);
    b.rect(0, glassH + 1, W, 1, C.wood[1]);
    b.rect(0, knee, W, 1, C.terracotta[0]);
    // Glaswand/Glasdach: Himmel + Sprossen (Sprossen werden nach dem Grading gezeichnet)
    b.rect(0, 0, W, glassH, [220, 228, 226]);
    out.windows.push({ x: 0, y: 0, w: W, h: glassH, bars: false });
    const panes = Math.max(2, Math.round(W / 16));
    for (let i = 0; i <= panes; i++) {
      const x = Math.round((i * (W - 1)) / panes);
      out.windows.push({ frame: true, x, y: 0, w: 1, h: glassH });
    }
    out.windows.push({ frame: true, x: 0, y: 9, w: W, h: 1 });
    out.windows.push({ frame: true, x: 0, y: 0, w: W, h: 2 });
    // schräge Dachstreben als Andeutung des Giebels
    for (let x = 0; x < W; x += 2) {
      const yy = Math.round(9 - 7 * Math.abs((x / W) * 2 - 1));
      out.windows.push({ frame: true, x, y: yy, w: 2, h: 1 });
    }
    // Seitliche Rahmen
    for (let y = glassH; y < H; y++) { b.set(0, y, C.dark[3]); b.set(W - 1, y, C.dark[3]); }
    // Laternen am Sockel (zwischen den Beetspalten)
    for (let x = d.side; x <= W - d.side; x += d.cellW) {
      const lx = Math.max(4, Math.min(W - 5, x));
      b.rect(lx, glassH + 2, 1, 2, C.dark[2]);
      b.rect(lx - 2, glassH + 4, 5, 6, C.dark[2]);
      b.rect(lx - 1, glassH + 5, 3, 4, C.lamp[1]);
      b.set(lx, glassH + 3, C.dark[3]);
      g.fillStyle = RAMPS.lamp[3];
      g.fillRect(lx - 1, glassH + 5, 3, 4);
      out.halos.push({ x: lx + 0.5, y: glassH + 7, r: 24, rgb: [255, 196, 110] });
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
    // Laubhaufen am Boden
    const leafCols = [C.petal_orange, C.bw_russet, C.petal_yellow, C.wood];
    for (let i = 0; i < Math.round((W * H) / 900); i++) {
      const cx = Math.floor(rnd() * W), cy = 42 + Math.floor(rnd() * (H - 44));
      const col = leafCols[Math.floor(rnd() * leafCols.length)];
      for (let k = 0; k < 5; k++) {
        const x = cx + Math.floor(rnd() * 6) - 3, y = cy + Math.floor(rnd() * 3) - 1;
        b.set(x, y, col[3]); b.set(x + 1, y, col[2]); b.set(x, y + 1, col[1]);
      }
    }
    // Randbäume links und rechts (hinter allen Pflanzen)
    for (const side of [0, 1]) {
      for (let k = 0, y = 78 + Math.floor(rnd() * 14); y < H + 10; k++, y += 44 + Math.floor(rnd() * 16)) {
        const x = side ? W - 16 + Math.floor(rnd() * 4) : -14 - Math.floor(rnd() * 4);
        after.push([treeArt((k + side) % 2), x, y - 58]);
      }
    }
    for (let i = 0; i < Math.max(5, Math.round((W * H) / 2600)); i++)
      out.fireflies.push({ x: 6 + Math.floor(rnd() * (W - 12)), y: 30 + Math.floor(rnd() * (H - 34)), p: rnd() * Math.PI * 2 });
    out.moonbeams = [];
    for (let i = 0; i < Math.max(2, Math.round(W / 70)); i++)
      out.moonbeams.push({ x: Math.round(((i + 0.3 + rnd() * 0.4) * W) / Math.max(2, Math.round(W / 70))), w: 6 + Math.floor(rnd() * 8), dx: Math.round(H * 0.35) });
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
    // Hecke ganz hinten, davor Zaun (nach flush), dann ein Trampelpfad
    for (let x = 0; x < W; x++) {
      const top = 3 + Math.round(Math.sin(x / 3.1 + seed) * 1.5 + Math.sin(x / 1.7) * 0.8);
      for (let y = 0; y < 9; y++) {
        if (y < top) b.set(x, y, noise(x >> 1, y, seed + 21) > 0.5 ? C.leaf_deep[2] : C.leaf_deep[1]);
        else if (y === top) b.set(x, y, C.leaf_deep[0]);
      }
    }
    for (let x = 0; x < W; x++) {
      const y0 = 16 + Math.round(Math.sin(x / 9 + seed) * 1.2), y1 = 23 + Math.round(Math.sin(x / 7 + 2) * 1.2);
      for (let y = y0; y <= y1; y++) {
        const n = noise(x, y, seed + 30);
        let col = n > 0.7 ? C.soil[4] : C.gh_pumpkin_beige[1];
        if (y === y0) col = C.leaf[1];
        else if (y === y1) col = C.leaf[3];
        else if (n < 0.06) col = C.stone[3];
        else if (n < 0.1) col = C.stone[1];
        b.set(x, y, col);
      }
    }
    after.push([fenceArt(W), 0, 1]);
    const bx = 14 + Math.floor(rnd() * Math.max(1, W - 56));
    after.push([benchArt(), bx, 7]);
    const posts = [];
    for (let x = 4; x < W - 2; x += 12) if (x + 3 < bx || x > bx + 28) posts.push(x);
    if (posts.length) {
      const px = posts[Math.floor(rnd() * posts.length)];
      after.push([lanternArt(), px - 2, 6]);
      out.halos.push({ x: px + 1.5, y: 11, r: 22, rgb: [255, 200, 120] });
    }
    for (let i = 0; i < Math.max(6, Math.round((W * H) / 1800)); i++)
      out.fireflies.push({ x: Math.floor(rnd() * W), y: 6 + Math.floor(rnd() * (H - 10)), p: rnd() * Math.PI * 2 });
    // Tagsüber: ein paar Schmetterlinge und Bienen
    const wings = [[C.petal_white[3], C.petal_white[2]], [C.petal_yellow[3], C.petal_yellow[2]], [C.petal_orange[3], C.petal_orange[1]], [C.petal_blue[3], C.petal_blue[2]]];
    for (let i = 0; i < Math.max(3, Math.round((W * H) / 7000)); i++) {
      const wcol = wings[Math.floor(rnd() * wings.length)];
      out.critters.push({ x: 16 + Math.floor(rnd() * (W - 32)), y: 34 + Math.floor(rnd() * (H - 44)), p: rnd() * Math.PI * 2, bee: rnd() < 0.4, rgb: wcol[0], rgb2: wcol[1] });
    }
    out.outside = [40, 70, 42];
  }

  out.canvas = b.flush();
  for (const [art, x, y] of after) art.drawTo(b.ctx, x, y, g);
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

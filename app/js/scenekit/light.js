// Licht und Atmosphäre (Browser): Himmel, Tag/Nacht-Grading, Leuchten, Lichtstrahlen.
// Licht L kommt aus sun.js: { mult: [r,g,b], sky: [r,g,b], glow: 0..1, phase }.
import { mulberry32 } from './rng.js';

/** RGB mit dem Licht multiplizieren (z. B. für Farben, die im Renderer gemalt werden). */
export function tint(rgb, L, a = 1) {
  const m = L?.mult || [255, 255, 255];
  return `rgba(${rgb.map((v, i) => Math.round((v * m[i]) / 255)).join(',')},${a})`;
}

/**
 * Himmel über die ganze Fläche: Verlauf in Pixelbändern, nachts Sterne, tags Wolken.
 * Szenen mit sky: true bekommen ihn hinter den Hintergrund (scheint durch Löcher).
 */
export function paintSky(ctx, W, H, L, seed = 1) {
  const [r, g, b] = L.sky;
  const bands = 6, top = [r * 0.72, g * 0.8, b * 0.92];
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    ctx.fillStyle = `rgb(${Math.round(top[0] + (r - top[0]) * t)},${Math.round(top[1] + (g - top[1]) * t)},${Math.round(top[2] + (b - top[2]) * t)})`;
    const y0 = Math.floor((i * H) / bands), y1 = Math.floor(((i + 1) * H) / bands);
    ctx.fillRect(0, y0, W, y1 - y0);
  }
  const rnd = mulberry32(seed);
  if (L.glow > 0.55) {
    const a = Math.min(1, (L.glow - 0.55) * 2.4);
    for (let i = 0; i < (W * H) / 90; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), big = rnd() < 0.08;
      ctx.fillStyle = `rgba(255,246,214,${a * (big ? 1 : 0.55)})`;
      ctx.fillRect(x, y, 1, 1);
      if (big) {
        ctx.fillStyle = `rgba(255,246,214,${a * 0.35})`;
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    // Mond
    const mx = Math.floor(W * 0.78), my = Math.floor(Math.min(H * 0.12, 30)) + 6;
    ctx.fillStyle = `rgba(250,240,206,${a})`;
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17 && (x - 2) ** 2 + (y + 1) ** 2 > 10) ctx.fillRect(mx + x, my + y, 1, 1);
  } else if (L.glow < 0.35) {
    // Wolken (Pixel-Haufen)
    const a = 0.85 * (1 - L.glow * 2.5);
    for (let i = 0; i < Math.max(2, W / 50); i++) {
      const cx = Math.floor(rnd() * W), cy = 6 + Math.floor(rnd() * Math.min(60, H * 0.4)), w = 10 + Math.floor(rnd() * 14);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(cx, cy, w, 2);
      ctx.fillRect(cx + 3, cy - 2, Math.floor(w * 0.45), 2);
      ctx.fillRect(cx + Math.floor(w * 0.5), cy - 1, Math.floor(w * 0.35), 1);
      ctx.fillStyle = `rgba(214,226,240,${a})`;
      ctx.fillRect(cx + 1, cy + 2, w - 2, 1);
    }
  }
}

/**
 * Licht in Innenräumen: tags wie draußen, nachts warm und lampenhell statt blau.
 * warm = Farbe bei voller Nacht, k = Stärke.
 */
export function indoorMult(L, warm = [214, 170, 132], k = 0.85) {
  const t = Math.min(1, L.glow * k);
  return L.mult.map((v, i) => Math.round(v + (Math.max(v, warm[i]) - v) * t));
}

/**
 * src gegradet (multipliziert mit L.mult) nach dst zeichnen, Alpha bleibt erhalten.
 * tmp: Hilfs-Canvas gleicher Größe. zones: [{x, y, w, h}] Innenraum-Flächen,
 * die stattdessen mit inMult gegradet werden (siehe indoorMult).
 */
export function drawGraded(dst, src, L, tmp, zones = null, inMult = null) {
  const t = tmp.getContext('2d');
  t.globalCompositeOperation = 'copy';
  t.drawImage(src, 0, 0);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = `rgb(${L.mult.join(',')})`;
  if (zones?.length && inMult) {
    t.beginPath();
    t.rect(0, 0, tmp.width, tmp.height);
    for (const z of zones) t.rect(z.x, z.y, z.w, z.h);
    t.fill('evenodd');
    t.fillStyle = `rgb(${inMult.join(',')})`;
    for (const z of zones) t.fillRect(z.x, z.y, z.w, z.h);
  } else t.fillRect(0, 0, tmp.width, tmp.height);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(src, 0, 0);
  t.globalCompositeOperation = 'source-over';
  dst.drawImage(tmp, 0, 0);
}

/** Weiche Lichthöfe (nachts): [{x, y, r, rgb, a?}] */
export function drawHalos(ctx, halos, strength) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const h of halos) {
    const a = (h.a ?? 0.28) * strength;
    const gr = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
    gr.addColorStop(0, `rgba(${h.rgb.join(',')},${a})`);
    gr.addColorStop(1, `rgba(${h.rgb.join(',')},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
  }
  ctx.restore();
}

/**
 * Lichtstrahlen als Polygone: [{pts: [[x,y],...], rgb, a, when: 'day'|'night'}]
 * Tagsüber z. B. Sonne durchs Schaufenster, nachts Mondlicht im Wald.
 */
export function drawBeams(ctx, beams, L) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of beams) {
    const k = b.when === 'night' ? Math.max(0, (L.glow - 0.3) / 0.7) : Math.max(0, 1 - L.glow * 1.6);
    if (k <= 0.02) continue;
    const ys = b.pts.map((p) => p[1]);
    const gr = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    gr.addColorStop(0, `rgba(${b.rgb.join(',')},${b.a * k})`);
    gr.addColorStop(1, `rgba(${b.rgb.join(',')},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

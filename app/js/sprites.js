// Sprite-Laden mit Manifest (app/data/sprites.json), Glow-Masken und
// Platzhaltern für noch nicht gezeichnete Arten.
import { PLANT_BY_ID } from './plants.js';
import { PixelArt, makeCanvas, SHADE, BASE, LIGHT, HIGH } from './pixelart.js';
import { VARIANT_RAMP } from './palette.js';

/** Sprite-Zeile, auf der Stiele ohne Beet-Fuß in der Erde stehen (parts_gewaechshaus.SOIL_Y). */
export const NOFOOT_ANCHOR = 27;

const SPRITE_BASE = new URL('../../art/sprites/', import.meta.url);
const MANIFEST_URL = new URL('../data/sprites.json', import.meta.url);

let manifest = { species: {} };
const cache = new Map(); // key → Promise<{img, glow, placeholder}>
const ready = new Map(); // key → {img, glow, placeholder}

export async function loadManifest() {
  try {
    const r = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch {
    /* offline ohne Cache: nur Platzhalter */
  }
  return manifest;
}

export function variantsOf(species) {
  const m = manifest.species?.[species];
  if (m && m.variants?.length) return m.variants;
  return PLANT_BY_ID[species]?.variants || [];
}

export function pickVariant(species, rnd = Math.random) {
  const v = variantsOf(species);
  return v.length ? v[Math.floor(rnd() * v.length)] : null;
}

export function hasRealSprites(species) {
  return !!manifest.species?.[species];
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('404 ' + url));
    img.src = url;
  });
}

function fileUrl(region, species, name) {
  return new URL(`${region}/${species}/${name}.png`, SPRITE_BASE).href;
}

/** Wählt die beste vorhandene Datei laut Manifest. */
function resolveFile(m, stage, variant, opts = {}) {
  const files = new Set(m.files);
  const stages = [...m.stages].sort((a, b) => a - b);
  let st = stage;
  if (!stages.includes(st)) st = stages.filter((s) => s <= stage).pop() ?? stages[0];
  const cands = [];
  if (variant) cands.push(`stage${st}_${variant}`);
  cands.push(`stage${st}`);
  for (const f of m.files) if (f.startsWith(`stage${st}_`) && !f.endsWith('_glow') && !f.endsWith('_nofoot')) cands.push(f);
  let name = cands.find((c) => files.has(c));
  if (!name) return null;
  let glow = m.glow?.includes(name) ? name + '_glow' : null;
  // Variante ohne eigenen Beet-Fuß (für die gezeichneten Beete im Gewächshaus)
  const nofoot = !!(opts.nofoot && m.nofoot?.includes(name) && files.has(name + '_nofoot'));
  if (nofoot) {
    name += '_nofoot';
    glow = files.has(name + '_glow') ? name + '_glow' : null;
  }
  return { name, glow, nofoot };
}

function maskedGlow(img, mask) {
  const c = makeCanvas(32, 32);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const sd = ctx.getImageData(0, 0, 32, 32);
  const m = makeCanvas(32, 32).getContext('2d');
  m.drawImage(mask, 0, 0);
  const md = m.getImageData(0, 0, 32, 32).data;
  for (let i = 0; i < sd.data.length; i += 4) sd.data[i + 3] = (sd.data[i + 3] * md[i]) / 255;
  ctx.putImageData(sd, 0, 0);
  return c;
}

async function load(species, stage, variant, opts = {}) {
  const plant = PLANT_BY_ID[species];
  const region = plant?.region || manifest.species?.[species]?.region || 'pflanzenhandlung';
  const m = manifest.species?.[species];
  try {
    if (m) {
      const f = resolveFile(m, stage, variant, opts);
      if (!f) throw new Error('keine Datei');
      const img = await loadImage(fileUrl(m.region, species, f.name));
      let glow = null;
      if (f.glow) {
        try {
          glow = maskedGlow(img, await loadImage(fileUrl(m.region, species, f.glow)));
        } catch { /* ohne Glow weiter */ }
      }
      return { img, glow, placeholder: false, nofoot: f.nofoot };
    }
    // Nicht im Manifest (evtl. veraltet): Konvention probieren
    const names = variant ? [`stage${stage}_${variant}`, `stage${stage}`] : [`stage${stage}`];
    for (const n of names) {
      try {
        return { img: await loadImage(fileUrl(region, species, n)), glow: null, placeholder: false };
      } catch { /* nächster */ }
    }
    throw new Error('nicht gefunden');
  } catch {
    return { ...placeholder(species, stage, variant), placeholder: true };
  }
}

/**
 * Lädt ein Sprite (gecacht). → Promise<{img, glow, placeholder, nofoot}>
 * opts.nofoot: wenn vorhanden, die Variante ohne eigenen Beet-Fuß laden
 * (nofoot: true im Ergebnis; Erdpunkt liegt dann bei Zeile NOFOOT_ANCHOR).
 */
export function getSprite(species, stage, variant = null, opts = {}) {
  const key = `${species}|${stage}|${variant || ''}${opts.nofoot ? '|nofoot' : ''}`;
  if (!cache.has(key)) {
    cache.set(key, load(species, stage, variant, opts).then((s) => {
      ready.set(key, s);
      return s;
    }));
  }
  return cache.get(key);
}

export function peekSprite(species, stage, variant = null) {
  return ready.get(`${species}|${stage}|${variant || ''}`) || null;
}

// --- Platzhalter -------------------------------------------------------------

const FRUIT = { tomate: 'petal_red', chili: 'petal_red', kuerbis: 'petal_orange', melone: 'leaf', gurke: 'leaf_deep' };
const CAP = { fliegenpilz: 'cap_red', steinpilz: 'wood', pfifferling: 'petal_orange', butterpilz: 'wood' };

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function ground(art, region) {
  if (region === 'pflanzenhandlung') {
    const pot = art.layer('terracotta');
    pot.rect(9, 24, 14, 2);
    pot.rect(10, 26, 12, 2);
    pot.rect(11, 28, 10, 3);
    const soil = art.layer('soil', { outline: false, shading: false });
    soil.rect(10, 24, 12, 1, SHADE);
    return 24;
  }
  const ramp = region === 'gewaechshaus' ? 'soil' : region === 'wald' ? 'moss' : 'leaf';
  art.layer(ramp).ellipse(16, 29.5, 9, 1.8);
  return 28;
}

/** Platzhalter-Sprite in der Form der Art, damit der Garten schon jetzt lesbar ist. */
export function placeholder(species, stage, variant) {
  const plant = PLANT_BY_ID[species] || { kind: 'leaf', region: 'pflanzenhandlung' };
  const art = new PixelArt();
  const top = ground(art, plant.region);
  const k = [0.35, 0.5, 0.68, 0.84, 1][Math.max(1, Math.min(5, stage)) - 1];
  const petal = VARIANT_RAMP[variant] || VARIANT_RAMP[plant.variants?.[0]] || 'petal_yellow';
  const r = hash(species);
  const H = Math.round(4 + 18 * k); // Pflanzenhöhe
  const cx = 16;

  switch (plant.kind) {
    case 'cactus': {
      const body = art.layer('leaf');
      body.ellipse(cx, top - H / 2, 2 + 2 * k, H / 2 + 0.5);
      if (stage >= 4) art.layer('leaf').rect(cx + 3, top - H * 0.7, 2, Math.round(H * 0.35)).set(cx + 3, top - H * 0.7 - 1);
      const sp = art.layer('cream', { outline: false, shading: false });
      for (let y = top - H + 2; y < top - 1; y += 3) sp.set(cx - 1, y, HIGH).set(cx + 1, y + 1, LIGHT);
      if (stage === 5) art.layer('petal_pink').ellipse(cx, top - H - 1, 1.5, 1);
      break;
    }
    case 'succulent': {
      const n = 3 + stage;
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (Math.PI * (i + 0.5)) / n;
        const L = 2 + 4 * k;
        const lf = art.layer('leaf_sage');
        lf.ellipse(cx + Math.cos(a) * L, top - 1 + Math.sin(a) * L * 0.7, 1.6 + k, 1.2 + k * 0.6);
        art.layer('petal_pink', { outline: false, shading: false }).set(cx + Math.cos(a) * (L + 1.8 + k), top - 1 + Math.sin(a) * (L + 1) * 0.7, BASE);
      }
      art.layer('leaf_sage').ellipse(cx, top - 2, 1.5 + k, 1.2 + k);
      break;
    }
    case 'mushroom':
    case 'glowmoss': {
      const glowing = plant.kind === 'glowmoss';
      if (glowing) art.layer('moss').ellipse(cx, top - 1, 4 + 6 * k, 1.5 + 2 * k);
      const caps = glowing ? Math.min(stage + 1, 5) : stage >= 5 ? 2 : 1;
      for (let i = 0; i < caps; i++) {
        const big = i === 0;
        const s = glowing ? 0.4 + 0.15 * ((i + r) % 3) : big ? k : 0.4;
        const x = glowing ? cx - 6 * k + ((i * 7 + r) % Math.max(1, Math.round(12 * k))) : big ? cx : cx + 6;
        const h = Math.round((glowing ? 5 : 3 + 10 * s));
        const base = glowing ? top - 1 - (i % 2) : top;
        art.layer('cream').rect(x - Math.max(1, Math.round(1.5 * s)), base - h, Math.max(2, Math.round(3 * s)), h);
        const cap = art.layer(glowing ? 'glow' : CAP[species] || 'wood', { glow: glowing });
        cap.ellipse(x, base - h, 1.5 + 4.5 * s, 1 + 2.2 * s);
        if (species === 'fliegenpilz') {
          const dots = art.layer('cream', { outline: false, shading: false });
          dots.set(x - 2 * s, base - h - 1, HIGH).set(x + 2 * s, base - h, HIGH).set(x, base - h - 2 * s, HIGH);
        }
      }
      break;
    }
    case 'flower':
    case 'veg':
    case 'berry':
    case 'leaf':
    default: {
      const ramp = plant.region === 'pflanzenhandlung' ? (r % 2 ? 'leaf_deep' : 'leaf') : plant.kind === 'flower' ? 'leaf_sage' : 'leaf';
      const leaves = 1 + stage + (plant.kind === 'leaf' ? 1 : 0);
      const stem = art.layer('stem', { outline: false, shading: false });
      const tips = [];
      for (let i = 0; i < leaves; i++) {
        const t = leaves === 1 ? 0.5 : i / (leaves - 1);
        const ang = (-150 + 120 * t + ((r >> i) % 15) - 7) * (Math.PI / 180);
        const len = H * (0.55 + 0.45 * Math.sin(Math.PI * t)) * (0.85 + ((r >> (i + 3)) % 4) * 0.05);
        const x = cx + Math.cos(ang) * len * 0.9, y = top - 1 + Math.sin(ang) * len;
        stem.line(cx, top - 1, x, y, BASE);
        tips.push([x, y]);
      }
      // Blätter (hinten zuerst)
      for (const [x, y] of tips) {
        const s = plant.kind === 'flower' ? 1.2 + k : 1.6 + 2.6 * k;
        art.layer(ramp).ellipse(x, y, s, s * 0.75);
      }
      if (plant.kind === 'flower' && stage >= 3) {
        const n = stage >= 5 ? 3 : stage >= 4 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const x = cx + [0, -6, 6][i], y = top - H - 3 + [0, 4, 3][i];
          stem.line(cx, top - 2, x, y, BASE);
          if (stage === 3) art.layer('leaf_sage').ellipse(x, y, 1.2, 1.6);
          else {
            const pr = species === 'gaensebluemchen' ? 'petal_white' : species === 'sonnenblume' && !variant ? 'petal_yellow' : petal;
            art.layer(pr).ellipse(x, y, 2.6 + k, 2 + k * 0.6);
            if (['gaensebluemchen', 'sonnenblume', 'germini'].includes(species))
              art.layer(species === 'sonnenblume' ? 'soil' : 'petal_yellow', { outline: false }).ellipse(x, y, 1, 0.8);
          }
        }
      }
      if (plant.kind === 'veg' && stage >= 4) {
        const fr = species === 'tomate' || species === 'chili' ? VARIANT_RAMP[variant] || FRUIT[species] : FRUIT[species] || 'petal_red';
        const big = species === 'kuerbis' || species === 'melone';
        const n = big ? 1 : stage === 5 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const [x, y] = big ? [cx + 3, top - 3] : tips[(i * 2 + 1) % tips.length];
          art.layer(fr).ellipse(x, big ? y : y + 2, big ? 3 + k * 2 : 1.4, big ? 2 + k : species === 'chili' || species === 'gurke' ? 2.2 : 1.4);
        }
      }
      if (plant.kind === 'berry' && stage >= 4) {
        const b = art.layer('petal_blue', { outline: false, shading: false });
        for (const [x, y] of tips) b.set(x + 1, y + 1, SHADE).set(x - 1, y + 2, BASE);
      }
      break;
    }
  }
  return art.toCanvas();
}

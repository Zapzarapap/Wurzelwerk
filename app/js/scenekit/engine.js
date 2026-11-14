// Szenen-Engine (rein, ohne DOM, getestet): verteilt Pflanzen auf Stellplätze
// („Spots“) der Abschnitte einer Region, lässt die Region in Abschnitten wachsen
// und füllt die Fläche auf Bildschirmgröße auf. Doku: docs/SZENEN.md
//
// Harte Regeln:
//  - Abschnitt i hängt nur von i ab (region.section(i) ist rein). Neue Abschnitte
//    ändern bestehende nicht.
//  - Der Spot einer Pflanze hängt nur von den Pflanzen vor ihr ab (chronologisch,
//    Zufall aus der Pflanzen-ID). Ein neuer Abschnitt kommt erst, wenn alle Spots
//    belegt sind. → Pflanzen ziehen nie um.
//  - Füll-Abschnitte (nur für den Bildschirm) werden erst nach dem Verteilen
//    angehängt und nie mit Pflanzen belegt.
import { rngFor } from './rng.js';

/** Tipp-Fläche um den Fußpunkt (Welt-Pixel). Spots können eigene `hit` haben. */
export const HIT = { dx: 8, up: 20, down: 1 };

export function hitBox(it) {
  const h = it.spot?.hit || HIT;
  return { x0: it.x - h.dx, x1: it.x + h.dx, y0: it.y - h.up, y1: it.y + (h.down ?? 1) };
}

/** Vorderste Pflanze (größtes z) unter dem Punkt. */
export function hitTest(items, wx, wy) {
  let hit = null;
  for (const it of items) {
    const b = hitBox(it);
    if (wx >= b.x0 && wx <= b.x1 && wy >= b.y0 && wy <= b.y1 && (!hit || it.z >= hit.z)) hit = it;
  }
  return hit;
}

/** Ungefähre Sprite-Fläche einer Pflanze (für Deko, die ausweichen soll). */
export function plantBox(it) {
  return { x0: it.x - 12, x1: it.x + 12, y0: it.y - 26, y1: it.y + 1 };
}

export const overlaps = (a, b) => !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);

export function chronological(plants) {
  return [...plants].sort((a, b) => (a.createdAt - b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Reihenfolge der Zellen eines wachsenden Rasters: [[c, r], ...].
 * Neue Reihe (r = R) oder Spalte (c = C) je nach Seitenverhältnis H/W ≈ aspect.
 * Reine Funktion von n und den Parametern → stabil.
 * opts: { cw, ch, aspect, start: [C, R] }
 */
export function gridSequence(n, { cw, ch, aspect = 1.4, start = [1, 1] }) {
  const out = [];
  let C = 0, R = 0;
  const addCol = () => { for (let r = 0; r < R; r++) out.push([C, r]); C++; };
  const addRow = () => { for (let c = 0; c < C; c++) out.push([c, R]); R++; };
  R = start[1];
  while (C < start[0]) addCol();
  while (out.length < n) {
    if ((R * ch) / (C * cw) > aspect) addCol();
    else addRow();
  }
  return out.slice(0, n);
}

/**
 * Lockere Streuung (Best-Candidate) in einem w×h-Rechteck, deterministisch.
 * Garantiert: Tipp-Flächen überlappen nicht (|dx| > 2·HIT.dx oder |dy| > HIT.up+1)
 * und liegen ganz im Rechteck. → [{x, y}] lokal.
 * opts: { n, tries = 24, margin = {x: 10, top: HIT.up + 2, bottom: 2}, keep = [] (feste Punkte, die frei bleiben) }
 */
export function scatter(w, h, rnd, { n, tries = 24, margin = {}, avoid = [] } = {}) {
  const mx = margin.x ?? 10, mt = margin.top ?? HIT.up + 2, mb = margin.bottom ?? 2;
  const pts = [];
  const clash = (x, y) => [...pts, ...avoid].some((p) => Math.abs(p.x - x) <= 2 * HIT.dx + 1 && Math.abs(p.y - y) <= HIT.up + 2);
  const score = (x, y) => {
    let best = Infinity;
    for (const p of [...pts, ...avoid]) best = Math.min(best, (p.x - x) ** 2 + ((p.y - y) * 1.3) ** 2);
    return best;
  };
  for (let k = 0; k < n; k++) {
    let bx = 0, by = 0, bd = -1;
    for (let t = 0; t < tries; t++) {
      const x = Math.round(mx + rnd() * (w - 2 * mx)), y = Math.round(mt + rnd() * (h - mt - mb));
      if (clash(x, y)) continue;
      const d = score(x, y);
      if (d > bd) { bd = d; bx = x; by = y; }
    }
    if (bd < 0) continue; // kein Platz mehr
    pts.push({ x: bx, y: by });
  }
  return pts;
}

/**
 * Szene bauen.
 * region: Modul aus app/js/scenes/ (siehe docs/SZENEN.md)
 * plants: [{id, createdAt, ...}]
 * fill: {W, H} in Welt-Pixeln oder null
 * → scene = {
 *     region, W, H, ox, oy,            // Weltgröße, Verschiebung Inhalt → Welt
 *     sections: [{index, rect, spots, fill?, ...}],
 *     spots: [...], free: [...],       // alle bzw. freie Spots (Welt-Koordinaten)
 *     items: [{plant, spot, x, y, z, flip}],  // nach z sortiert
 *     pieces: [...], front: [...],     // z-sortiert; Deko, die Pflanzen verdecken würde, ist raus
 *     content: {x0, y0, x1, y1},        // Inhaltsrechteck (Welt)
 *   }
 */
export function buildScene(region, plants, fill = null) {
  const sorted = chronological(plants);
  const sections = [];
  const open = [];
  const pad = { top: 0, right: 0, bottom: 0, left: 0, ...(region.pad || {}) };
  const addSection = (isFill = false) => {
    const i = sections.length;
    const s = region.section(i);
    const sec = { ...s, index: i, fill: isFill, rect: { ...s.rect } };
    sec.spots = (s.spots || []).map((p, n) => ({
      ...p,
      key: `${i}.${n}`,
      section: i,
      lx: p.x, ly: p.y,
      x: sec.rect.x + p.x,
      y: sec.rect.y + p.y,
      z: sec.rect.y + (p.z ?? p.y),
      plant: null,
    }));
    sections.push(sec);
    if (!isFill) open.push(...sec.spots);
    return sec;
  };
  const minS = region.minSections ?? 1;
  while (sections.length < minS) addSection();

  const items = [];
  for (const plant of sorted) {
    while (!open.length) addSection();
    const rnd = rngFor(plant.id);
    const flip = rnd() < 0.5;
    // gewichtete Wahl unter den freien Spots (spot.w, Standard 1)
    let u = rnd() * open.reduce((a, s) => a + (s.w ?? 1), 0), idx = open.length - 1;
    for (let k = 0; k < open.length; k++) if ((u -= open[k].w ?? 1) <= 0) { idx = k; break; }
    const spot = open.splice(idx, 1)[0];
    let x = spot.x, y = spot.y;
    if (spot.jitter) {
      x += Math.round((rnd() - 0.5) * 2 * spot.jitter);
      y += Math.round((rnd() - 0.5) * spot.jitter);
    }
    spot.plant = plant;
    items.push({ plant, spot, x, y, z: spot.z + (y - spot.y) * 0.01, flip: spot.noFlip ? false : flip });
  }

  const bbox = (list) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of list) {
      x0 = Math.min(x0, s.rect.x); y0 = Math.min(y0, s.rect.y);
      x1 = Math.max(x1, s.rect.x + s.rect.w); y1 = Math.max(y1, s.rect.y + s.rect.h);
    }
    return { x0: x0 - pad.left, y0: y0 - pad.top, x1: x1 + pad.right, y1: y1 + pad.bottom };
  };
  const baseBox = bbox(sections);
  const base = { W: baseBox.x1 - baseBox.x0, H: baseBox.y1 - baseBox.y0 };

  // Auffüllen: leere Abschnitte, solange sie auf den Bildschirm passen
  if (fill && region.fillSections !== false) {
    for (let k = 0; k < (region.maxFill ?? 40); k++) {
      const s = region.section(sections.length);
      const b = bbox([...sections, s]);
      if (b.x1 - b.x0 > fill.W || b.y1 - b.y0 > fill.H) break;
      addSection(true);
    }
  }
  const box = bbox(sections);
  const cw = box.x1 - box.x0, ch = box.y1 - box.y0;
  const W = fill ? Math.max(cw, Math.ceil(fill.W)) : cw;
  const H = fill ? Math.max(ch, Math.ceil(fill.H)) : ch;
  const anchor = region.anchor || 'center';
  const ex = W - cw, ey = H - ch;
  const ox = -box.x0 + Math.floor(ex / 2);
  const oy = -box.y0 + (anchor === 'top' ? 0 : anchor === 'bottom' ? ey : Math.floor(ey / 2));

  // in Welt-Koordinaten verschieben
  for (const s of sections) {
    s.rect = { ...s.rect, x: s.rect.x + ox, y: s.rect.y + oy };
    for (const p of s.spots) { p.x += ox; p.y += oy; p.z += oy; }
  }
  for (const it of items) { it.x += ox; it.y += oy; it.z += oy; }
  items.sort((a, b) => a.z - b.z || a.x - b.x);
  const spots = sections.flatMap((s) => s.spots);
  const scene = {
    region: region.id, W, H, ox, oy, base,
    sections, spots, free: spots.filter((s) => !s.plant), items,
    content: { x0: box.x0 + ox, y0: box.y0 + oy, x1: box.x1 + ox, y1: box.y1 + oy },
    capacity: sections.filter((s) => !s.fill).reduce((a, s) => a + s.spots.length, 0),
  };
  scene.pieces = settle(region.pieces ? region.pieces(scene) : [], scene);
  scene.front = settle(region.front ? region.front(scene) : [], scene);
  return scene;
}

/**
 * Deko-Regeln anwenden und nach z sortieren:
 *  - piece.spot = key → fällt weg, sobald auf dem Spot eine Pflanze steht
 *  - piece.yield = true und piece.box = {x0,y0,x1,y1} → fällt weg, wenn es eine Pflanze berührt
 */
export function settle(pieces, scene) {
  const taken = new Set(scene.items.map((it) => it.spot.key));
  const boxes = scene.items.map(plantBox);
  return pieces
    .filter((p) => !(p.spot && taken.has(p.spot)))
    .filter((p) => !(p.yield && p.box && boxes.some((b) => overlaps(b, p.box))))
    .sort((a, b) => a.z - b.z || a.x - b.x);
}

// Gestapeltes Balkendiagramm als SVG – ohne Library.
import { fmtAxis } from './format.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}

const STEPS_MIN = [5, 10, 15, 30, 60, 120, 180, 240, 360, 600, 1200, 1800, 3000, 6000, 12000, 30000];

export function niceMax(maxMs) {
  const maxMin = maxMs / 60000;
  for (const st of STEPS_MIN) if (maxMin <= st * 4) return { step: st * 60000, max: Math.max(st, Math.ceil(maxMin / st) * st) * 60000 };
  const st = STEPS_MIN[STEPS_MIN.length - 1];
  return { step: st * 60000, max: Math.ceil(maxMin / st) * st * 60000 };
}

/**
 * buckets: [{label, total, byTag}], tagOrder: [tagId], colorOf(tagId)
 * opts: { kind, highlight: index|null, selected: index|null, onSelect(i) }
 */
export function barChart(buckets, tagOrder, colorOf, opts = {}) {
  const W = 340, H = 176, padL = 32, padR = 6, padT = 10, padB = 20;
  const cw = W - padL - padR, ch = H - padT - padB;
  const maxVal = Math.max(...buckets.map((b) => b.total), 0);
  const { step, max } = niceMax(Math.max(maxVal, 15 * 60000));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Lernzeit-Diagramm' });

  // Gitter
  for (let v = 0; v <= max + 1; v += step) {
    const y = Math.round(padT + ch - (v / max) * ch) + 0.5;
    svg.append(s('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: v === 0 ? 'axis' : 'grid' }));
    svg.append(s('text', { x: padL - 5, y: y + 3.5, class: 'ylabel', 'text-anchor': 'end' }, fmtAxis(v)));
  }

  const n = buckets.length;
  const slot = cw / n;
  const bw = Math.max(2, Math.min(26, Math.floor(slot * (n > 20 ? 0.66 : 0.6))));
  const labelEvery = opts.kind === 'day' ? 6 : opts.kind === 'month' ? 5 : 1;

  buckets.forEach((b, i) => {
    const x = Math.round(padL + slot * i + (slot - bw) / 2);
    const g = s('g', { class: 'bar' + (opts.selected === i ? ' selected' : '') + (opts.highlight === i ? ' today' : '') });
    // Trefferfläche
    const hit = s('rect', { x: padL + slot * i, y: padT, width: slot, height: ch, class: 'hit' });
    g.append(hit);
    let y = padT + ch;
    for (const tag of tagOrder) {
      const v = b.byTag[tag];
      if (!v) continue;
      const hgt = (v / max) * ch;
      y -= hgt;
      g.append(s('rect', { x, y: y.toFixed(2), width: bw, height: Math.max(hgt, 0.8).toFixed(2), fill: colorOf(tag) }));
    }
    if (b.total > 0) {
      // Pixel-Kante oben
      g.append(s('rect', { x, y: y.toFixed(2), width: bw, height: 1.5, class: 'cap' }));
    }
    const show = opts.kind === 'month' ? (i === 0 || (i + 1) % labelEvery === 0) : i % labelEvery === 0;
    if (show) g.append(s('text', { x: x + bw / 2, y: H - 6, class: 'xlabel', 'text-anchor': 'middle' }, b.label));
    if (opts.onSelect) g.addEventListener('click', () => opts.onSelect(i));
    svg.append(g);
  });
  return svg;
}

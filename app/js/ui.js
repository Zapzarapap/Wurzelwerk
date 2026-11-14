// Kleine DOM-Helfer, Dialoge, Toasts, Pixel-Icons.
import { getSprite, peekSprite } from './sprites.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

/** Pixel-Sprite als Canvas mit ganzzahliger CSS-Skalierung. */
export function spriteEl(species, stage, variant, scale = 3, { flip = false } = {}) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  c.className = 'pix sprite';
  c.style.width = 32 * scale + 'px';
  c.style.height = 32 * scale + 'px';
  if (flip) c.style.transform = 'scaleX(-1)';
  const draw = (s) => {
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(s.img, 0, 0);
  };
  const ready = peekSprite(species, stage, variant);
  if (ready) draw(ready);
  else getSprite(species, stage, variant).then(draw);
  return c;
}

// --- Sheets / Dialoge --------------------------------------------------------
let sheetRoot = null;

export function openSheet(build, { onClose } = {}) {
  sheetRoot ||= document.getElementById('sheets');
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
  const close = (val) => {
    backdrop.classList.add('closing');
    panel.classList.add('closing');
    setTimeout(() => { backdrop.remove(); panel.remove(); }, 180);
    onClose?.(val);
  };
  backdrop.addEventListener('click', () => close(undefined));
  panel.append(h('div', { class: 'sheet-grip' }), build(close));
  sheetRoot.append(backdrop, panel);
  requestAnimationFrame(() => panel.querySelector('[autofocus]')?.focus());
  return close;
}

export function confirmDialog({ title, text, ok = 'OK', cancel = 'Abbrechen', danger = false, extra = null }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    openSheet((close) => h('div', { class: 'dialog' },
      h('h2', {}, title),
      text ? h('p', { class: 'muted' }, text) : null,
      h('div', { class: 'dialog-actions' },
        extra ? h('button', { class: 'btn ghost', onclick: () => { finish(extra.value); close(); } }, extra.label) : null,
        h('button', { class: 'btn secondary', onclick: () => { finish(false); close(); } }, cancel),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => { finish(true); close(); } }, ok),
      )), { onClose: () => finish(false) });
  });
}

export function toast(text, ms = 2600) {
  const root = document.getElementById('toasts');
  const t = h('div', { class: 'toast' }, text);
  root.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

// --- Pixel-Icons (SVG, crisp) ----------------------------------------------
// Jedes Icon: Liste von Rechtecken [x, y, w, h] in einem 12×12-Raster.
const ICONS = {
  learn: [[5, 1, 2, 1], [4, 2, 1, 2], [7, 2, 1, 2], [3, 3, 1, 1], [8, 3, 1, 1], [5, 4, 2, 1], [5, 5, 1, 3], [2, 7, 8, 1], [3, 8, 6, 1], [3, 9, 1, 2], [8, 9, 1, 2], [4, 10, 4, 1]],
  stats: [[1, 10, 10, 1], [2, 6, 2, 4], [5, 3, 2, 7], [8, 5, 2, 5]],
  garden: [[5, 1, 2, 1], [4, 2, 1, 2], [7, 2, 1, 2], [5, 4, 2, 1], [5, 5, 1, 4], [2, 5, 2, 1], [1, 4, 1, 1], [3, 6, 2, 1], [7, 6, 2, 1], [9, 5, 2, 1], [1, 9, 10, 1], [0, 10, 12, 1]],
  shop: [[3, 1, 6, 1], [2, 2, 1, 1], [9, 2, 1, 1], [1, 3, 10, 1], [1, 4, 1, 6], [10, 4, 1, 6], [1, 10, 10, 1], [5, 5, 2, 1], [4, 6, 1, 1], [5, 7, 2, 1], [7, 8, 1, 1], [5, 9, 2, 1], [5, 4, 1, 1], [6, 10, 1, 1]],
  settings: [[5, 0, 2, 2], [5, 10, 2, 2], [0, 5, 2, 2], [10, 5, 2, 2], [2, 2, 2, 2], [8, 2, 2, 2], [2, 8, 2, 2], [8, 8, 2, 2], [3, 4, 1, 4], [8, 4, 1, 4], [4, 3, 4, 1], [4, 8, 4, 1]],
  left: [[7, 2, 1, 1], [6, 3, 1, 1], [5, 4, 1, 1], [4, 5, 1, 2], [5, 7, 1, 1], [6, 8, 1, 1], [7, 9, 1, 1]],
  right: [[4, 2, 1, 1], [5, 3, 1, 1], [6, 4, 1, 1], [7, 5, 1, 2], [6, 7, 1, 1], [5, 8, 1, 1], [4, 9, 1, 1]],
  plus: [[5, 2, 2, 8], [2, 5, 8, 2]],
  minus: [[2, 5, 8, 2]],
  coin: [[4, 1, 4, 1], [2, 2, 2, 1], [8, 2, 2, 1], [1, 3, 1, 6], [10, 3, 1, 6], [2, 9, 2, 1], [8, 9, 2, 1], [4, 10, 4, 1], [5, 3, 2, 6], [4, 4, 1, 1], [7, 7, 1, 1]],
  lock: [[4, 1, 4, 1], [3, 2, 1, 3], [8, 2, 1, 3], [2, 5, 8, 6], [5, 7, 2, 2]],
  pause: [[3, 2, 2, 8], [7, 2, 2, 8]],
  play: [[3, 2, 1, 8], [4, 3, 1, 6], [5, 3, 1, 6], [6, 4, 1, 4], [7, 4, 1, 4], [8, 5, 1, 2]],
  stop: [[3, 3, 6, 6]],
  fit: [[1, 1, 3, 1], [1, 1, 1, 3], [8, 1, 3, 1], [10, 1, 1, 3], [1, 10, 3, 1], [1, 8, 1, 3], [8, 10, 3, 1], [10, 8, 1, 3]],
  sun: [[5, 0, 2, 2], [5, 10, 2, 2], [0, 5, 2, 2], [10, 5, 2, 2], [4, 3, 4, 6], [3, 4, 6, 4], [1, 1, 2, 2], [9, 1, 2, 2], [1, 9, 2, 2], [9, 9, 2, 2]],
  moon: [[5, 1, 3, 1], [3, 2, 3, 1], [2, 3, 3, 1], [2, 4, 2, 4], [2, 8, 3, 1], [3, 9, 3, 1], [5, 10, 3, 1], [8, 9, 2, 1], [9, 8, 1, 1]],
  edit: [[8, 1, 2, 1], [7, 2, 1, 1], [10, 2, 1, 1], [6, 3, 1, 1], [9, 3, 1, 1], [5, 4, 1, 1], [8, 4, 1, 1], [4, 5, 1, 1], [7, 5, 1, 1], [3, 6, 1, 1], [6, 6, 1, 1], [2, 7, 1, 2], [5, 7, 1, 1], [3, 9, 2, 1], [2, 9, 1, 1]],
  trash: [[4, 1, 4, 1], [1, 2, 10, 1], [2, 3, 1, 8], [9, 3, 1, 8], [2, 10, 8, 1], [4, 4, 1, 5], [7, 4, 1, 5]],
  share: [[5, 1, 2, 1], [4, 2, 4, 1], [3, 3, 1, 1], [8, 3, 1, 1], [5, 3, 2, 5], [1, 6, 2, 1], [9, 6, 2, 1], [1, 7, 1, 4], [10, 7, 1, 4], [1, 10, 10, 1]],
  close: [[2, 2, 2, 2], [8, 2, 2, 2], [4, 4, 4, 4], [2, 8, 2, 2], [8, 8, 2, 2]],
};

export function icon(name, size = 24) {
  const rects = ICONS[name] || [];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="${size}" height="${size}" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${rects.map(([x, y, w, hh]) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}"/>`).join('')}</svg>`;
  const span = h('span', { class: 'icon', html: svg });
  return span;
}

export function segmented(options, value, onChange, cls = '') {
  const wrap = h('div', { class: 'segmented ' + cls, role: 'tablist' });
  for (const [v, label] of options) {
    wrap.append(h('button', {
      class: v === value ? 'on' : '',
      role: 'tab',
      'aria-selected': v === value ? 'true' : 'false',
      onclick: () => onChange(v),
    }, label));
  }
  return wrap;
}

export function tokenBadge(n) {
  return h('span', { class: 'tokens' }, icon('coin', 14), h('span', {}, n.toLocaleString('de-DE')));
}

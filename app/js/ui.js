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
// Jedes Icon ist ein 12×12-Pixelbild. '#' = currentColor (färbt sich mit dem
// Text), andere Zeichen = feste Farben aus PAL (für Münze, Sonne, Mond).
// Größen werden auf Vielfache von 12 gerundet, damit jedes Pixel ganzzahlig ist.
const PAL = {
  o: '#7a520e', b: '#e4b832', h: '#fae078', s: '#b08018', w: '#fffce8', // Gold
  r: '#e47c2c', y: '#f4c838', Y: '#fde68a', d: '#c4801e', // Sonne
  m: '#7080c0', n: '#e8e4c8', N: '#fffbe8', // Mond
};
const ICONS = {
  learn: [ // Sanduhr
    '.##########.',
    '..#......#..',
    '..#.####.#..',
    '...#.##.#...',
    '....#..#....',
    '.....##.....',
    '.....##.....',
    '....#..#....',
    '...#....#...',
    '..#..##..#..',
    '..#.####.#..',
    '.##########.',
  ],
  garden: [ // Landschaft: Baum, Busch, Boden
    '............',
    '...###......',
    '..#####.....',
    '.#######....',
    '.#######....',
    '..#####.....',
    '...###......',
    '....#...##..',
    '....#..####.',
    '....#..####.',
    '############',
    '............',
  ],
  shop: [ // Marktstand mit gestreifter Markise
    '............',
    '############',
    '#..##..##..#',
    '#..##..##..#',
    '.##..##..##.',
    '.#........#.',
    '.#........#.',
    '.#.##..##.#.',
    '.##########.',
    '.#........#.',
    '.#........#.',
    '.##########.',
  ],
  stats: [
    '............',
    '............',
    '............',
    '.....##.....',
    '.....##.....',
    '.....##.##..',
    '..##.##.##..',
    '..##.##.##..',
    '..##.##.##..',
    '..##.##.##..',
    '.##########.',
    '............',
  ],
  settings: [ // Zahnrad mit Mittelloch
    '.....##.....',
    '.##..##..##.',
    '.##########.',
    '..########..',
    '..###..###..',
    '####....####',
    '####....####',
    '..###..###..',
    '..########..',
    '.##########.',
    '.##..##..##.',
    '.....##.....',
  ],
  left: [
    '............', '............', '.......#....', '......##....', '.....##.....', '....##......',
    '....##......', '.....##.....', '......##....', '.......#....', '............', '............',
  ],
  right: [
    '............', '............', '....#.......', '....##......', '.....##.....', '......##....',
    '......##....', '.....##.....', '....##......', '....#.......', '............', '............',
  ],
  plus: [
    '............', '............', '.....##.....', '.....##.....', '.....##.....', '..########..',
    '..########..', '.....##.....', '.....##.....', '.....##.....', '............', '............',
  ],
  minus: [
    '............', '............', '............', '............', '............', '..########..',
    '..########..', '............', '............', '............', '............', '............',
  ],
  coin: [ // goldene Token-Münze mit Glanzpunkt
    '....oooo....',
    '..oobbbboo..',
    '.oobhhhhboo.',
    '.obwhbbbsbo.',
    'obhhbbbbbsbo',
    'obhbbbbbbsbo',
    'obhbbbbbbsbo',
    'obhbbbbbbsbo',
    '.obsbbbbsbo.',
    '.oobssssboo.',
    '..oobbbboo..',
    '....oooo....',
  ],
  lock: [
    '............', '....####....', '...#....#...', '...#....#...', '...#....#...', '..########..',
    '..########..', '..###..###..', '..###..###..', '..########..', '..########..', '............',
  ],
  pause: [
    '............', '............', '...##..##...', '...##..##...', '...##..##...', '...##..##...',
    '...##..##...', '...##..##...', '...##..##...', '...##..##...', '............', '............',
  ],
  play: [
    '............', '...##.......', '...###......', '...####.....', '...#####....', '...######...',
    '...######...', '...#####....', '...####.....', '...###......', '...##.......', '............',
  ],
  stop: [
    '............', '............', '............', '...######...', '...######...', '...######...',
    '...######...', '...######...', '...######...', '............', '............', '............',
  ],
  fit: [
    '............', '.###....###.', '.#........#.', '.#........#.', '............', '............',
    '............', '............', '.#........#.', '.#........#.', '.###....###.', '............',
  ],
  sun: [
    '.....rr.....',
    '.r...rr...r.',
    '..r......r..',
    '....dddd....',
    '...dYyyyd...',
    'rr.dYyyyd.rr',
    'rr.dyyyyd.rr',
    '...dyyyyd...',
    '....dddd....',
    '..r......r..',
    '.r...rr...r.',
    '.....rr.....',
  ],
  moon: [
    '............',
    '...mm.......',
    '..mNm.......',
    '.mNnm.......',
    '.mNnm.......',
    '.mnnm.......',
    '.mnnm.......',
    '.mnnnm......',
    '.mnnnnmmmmm.',
    '..mnnnnnnm..',
    '...mmmmmm...',
    '............',
  ],
  edit: [ // Stift, 1 px Kontur wie die übrigen Icons
    '.........##.',
    '........#..#',
    '.......#..#.',
    '......#..#..',
    '.....#..#...',
    '....#..#....',
    '...#..#.....',
    '..#..#......',
    '.#..#.......',
    '.#.#........',
    '.##.........',
    '............',
  ],
  trash: [
    '............', '....####....', '.##########.', '..#......#..', '..#.#..#.#..', '..#.#..#.#..',
    '..#.#..#.#..', '..#.#..#.#..', '..#.#..#.#..', '..#......#..', '..########..', '............',
  ],
  share: [
    '.....##.....', '....####....', '...#.##.#...', '.....##.....', '.....##.....', '.##..##..##.',
    '.#........#.', '.#........#.', '.#........#.', '.#........#.', '.##########.', '............',
  ],
  close: [
    '............', '............', '..#......#..', '...#....#...', '....#..#....', '.....##.....',
    '.....##.....', '....#..#....', '...#....#...', '..#......#..', '............', '............',
  ],
  warn: [
    '.....##.....', '.....##.....', '....#..#....', '....#..#....', '...#.##.#...', '...#.##.#...',
    '..#..##..#..', '..#..##..#..', '.#........#.', '.#...##...#.', '############', '............',
  ],
};

const svgCache = new Map();
function iconSvg(name, size) {
  const key = name + '|' + size;
  if (svgCache.has(key)) return svgCache.get(key);
  const rows = ICONS[name] || [];
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== '.') rects += `<rect x="${x}" y="${y}" width="${w}" height="1"${ch === '#' ? '' : ` fill="${PAL[ch]}"`}/>`;
      x += w;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="${size}" height="${size}" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${rects}</svg>`;
  svgCache.set(key, svg);
  return svg;
}

export const ICON_NAMES = Object.keys(ICONS);

/** Pixel-Icon; size wird auf 12/24/36 … gerundet (ganzzahlige Pixel). */
export function icon(name, size = 24) {
  const s = Math.max(12, Math.round(size / 12) * 12);
  return h('span', { class: 'icon icon-' + name, html: iconSvg(name, s) });
}

/** Kleines Pflanzen-Sprite als Ortsmarker (Stufe 5 einer typischen Art). */
export const REGION_MARKERS = {
  pflanzenhandlung: ['monstera', null],
  gewaechshaus: ['tomate', 'rot'],
  blumenwiese: ['mohn', 'rot'],
  wald: ['fliegenpilz', null],
};
export function regionMarker(region, scale = 1) {
  const [sp, v] = REGION_MARKERS[region] || [];
  if (!sp) return null;
  const el = spriteEl(sp, 5, v, scale);
  el.classList.add('region-marker');
  el.setAttribute('aria-hidden', 'true');
  return el;
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
  return h('span', { class: 'tokens', 'aria-label': `${n.toLocaleString('de-DE')} Tokens` }, icon('coin', 12), h('span', {}, n.toLocaleString('de-DE')));
}

// Orte: Ansicht pro Region (Pflanzenhandlung, Gewächshaus, Blumenwiese, Wald), Filter Zeitraum + Tag, Tageszeit-Licht.
import { h, clear, icon, segmented, spriteEl, regionMarker } from '../ui.js';
import { plural } from '../text.js';
import * as store from '../store.js';
import { REGIONS, REGION_BY_ID, PLANT_BY_ID, VARIANT_LABELS } from '../plants.js';
import { CONFIG } from '../config.js';
import { GardenRenderer } from '../garden.js';
import { periodRange, shiftAnchor } from '../stats.js';
import { periodLabel, fmtDuration, fmtDate, fmtTime } from '../format.js';
import { currentLight, todaySun } from '../clock.js';
import { openRetagSheet } from './sessionsheet.js';

/** Kurzer Name + Symbol der Lichtphase für den Chip (passt auch bei 320–390 px). */
export function lightView(L) {
  const label = { Morgendämmerung: 'Morgenrot' }[L.phase] || L.phase;
  const icon = L.phase === 'Tag' ? 'sun' : (L.phase === 'Morgendämmerung' || L.phase === 'Abendrot') ? 'horizon' : 'moon';
  return { label, icon };
}

/** Inhalt der Info-Karte zu einer angetippten Pflanze (exportiert für tools/check_overflow.py). */
export function plantInfoContent(p, { flip = false, onClose, onRetag } = {}) {
  const sp = PLANT_BY_ID[p.species];
  return [
    spriteEl(p.species, p.stage, p.variant, 2, { flip }),
    h('div', { class: 'grow info-text' },
      h('strong', { class: 'pname' }, sp?.label || p.species, p.variant ? h('span', { class: 'muted' }, ' · ' + (VARIANT_LABELS[p.variant] || p.variant)) : null),
      h('div', { class: 'muted small' }, `Stufe ${p.stage} · ${fmtDuration(p.minutes * 60000)} · ${fmtDate(p.createdAt)}`),
      h('div', { class: 'small info-tag' }, h('span', { class: 'dot', style: { background: store.tagColor(p.tagId) } }), h('span', { class: 'tname' }, store.tagName(p.tagId))),
      store.S.sessions.some((x) => x.id === p.sessionId)
        ? h('button', { class: 'link-btn', onclick: () => (onRetag ? onRetag(p) : openRetagSheet(p.sessionId)) }, 'Tag ändern') : null),
    h('button', { class: 'icon-btn small', 'aria-label': 'Schließen', onclick: () => onClose?.() }, icon('close', 24)),
  ];
}

const PERIODS = [['day', 'Tag'], ['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr'], ['all', 'Gesamt']];
const state = { region: null, kind: 'all', anchor: new Date(), tag: '' };

export function mount(root, { navigate, params }) {
  if (params?.region) state.region = params.region;
  if (!state.region || !store.isRegionUnlocked(state.region)) state.region = store.unlockedRegions()[0]?.id || 'pflanzenhandlung';

  const page = h('div', { class: 'page garden' });
  const head = h('div', { class: 'garden-head' });
  const stageWrap = h('div', { class: 'garden-stage' });
  const canvas = h('canvas', { class: 'garden-canvas pix', 'aria-label': 'Ort' });
  const info = h('div', { class: 'plant-info hidden' });
  const lightChip = h('div', { class: 'light-chip' });
  const countChip = h('div', { class: 'count-chip' });
  const empty = h('div', { class: 'garden-empty hidden' });
  // Steuerleiste unter der Fläche: verdeckt nichts von der Region
  // (nur bei CONFIG.garden.ortZoomEnabled; sonst feste Ansicht ohne Zoom-Knöpfe)
  const tools = !CONFIG.garden.ortZoomEnabled ? null : h('div', { class: 'garden-tools' },
    h('button', { class: 'icon-btn', 'aria-label': 'Herauszoomen', onclick: () => renderer.zoomBy(1 / 1.5) }, icon('minus', 12)),
    h('button', { class: 'icon-btn', 'aria-label': 'Hineinzoomen', onclick: () => renderer.zoomBy(1.5) }, icon('plus', 12)),
    h('button', { class: 'icon-btn', 'aria-label': 'Ganzen Ort zeigen', onclick: () => renderer.fit() }, icon('fit', 12)),
  );
  const bar = h('div', { class: 'garden-bar' }, h('div', { class: 'garden-chips' }, lightChip, countChip), tools);
  stageWrap.append(canvas, empty, info);
  page.append(head, stageWrap, bar);
  root.append(page);

  const renderer = new GardenRenderer(canvas, { onTap: showInfo });

  function filtered() {
    const r = periodRange(state.kind, state.anchor);
    return store.S.plants.filter((p) => p.region === state.region
      && p.createdAt >= +r.start && p.createdAt < +r.end
      && (!state.tag || p.tagId === state.tag));
  }

  function renderHead() {
    const prevScroll = head.querySelector('.region-tabs')?.scrollLeft || 0;
    clear(head);
    // Regionen
    const regs = h('div', { class: 'region-tabs', role: 'group', 'aria-label': 'Orte' });
    for (const r of REGIONS) {
      const unlocked = store.isRegionUnlocked(r.id);
      regs.append(h('button', {
        class: (r.id === state.region ? 'on ' : '') + (unlocked ? '' : 'locked'),
        onclick: () => {
          if (!unlocked) return navigate('laden');
          state.region = r.id;
          hideInfo();
          update(true);
        },
        'aria-pressed': String(r.id === state.region),
        'aria-label': unlocked ? r.name : `${r.name} (gesperrt, im Shop freischalten)`,
      }, regionMarker(r.id, 1), h('span', { class: 'rtab-name' }, r.name), unlocked ? null : icon('lock', 12)));
    }
    head.append(regs);
    regs.scrollLeft = prevScroll;
    // aktiven Reiter ins Bild scrollen (Reiterleiste scrollt horizontal)
    requestAnimationFrame(() => {
      const on = regs.querySelector('button.on');
      if (on && regs.scrollWidth > regs.clientWidth) {
        const l = on.offsetLeft - regs.offsetLeft, r = l + on.offsetWidth;
        if (l < regs.scrollLeft + 8) regs.scrollLeft = Math.max(0, l - 12);
        else if (r > regs.scrollLeft + regs.clientWidth - 8) regs.scrollLeft = r - regs.clientWidth + 12;
      }
    });
    // Filter
    const row = h('div', { class: 'filter-row' });
    row.append(segmented(PERIODS, state.kind, (k) => { state.kind = k; state.anchor = new Date(); update(); }, 'small'));
    head.append(row);
    const row2 = h('div', { class: 'filter-row' });
    if (state.kind !== 'all') {
      const now = new Date();
      const lbl = periodLabel(state.kind, state.anchor, now);
      const cur = +periodRange(state.kind, now).start === +periodRange(state.kind, state.anchor).start;
      row2.append(h('div', { class: 'mini-nav' },
        h('button', { class: 'icon-btn small', 'aria-label': 'Zurück', onclick: () => { state.anchor = shiftAnchor(state.kind, state.anchor, -1); update(); } }, icon('left', 12)),
        h('button', { class: 'mini-title', onclick: () => { state.anchor = new Date(); update(); } }, lbl.title),
        h('button', { class: 'icon-btn small', 'aria-label': 'Weiter', disabled: cur, onclick: () => { state.anchor = shiftAnchor(state.kind, state.anchor, 1); update(); } }, icon('right', 12)),
      ));
    } else row2.append(h('div', { class: 'mini-nav' }, h('span', { class: 'mini-title' }, 'Alle Pflanzen')));
    const sel = h('select', { class: 'select', 'aria-label': 'Tag-Filter', onchange: (e) => { state.tag = e.target.value; update(); } },
      h('option', { value: '' }, 'Alle Tags'),
      store.S.tags.filter((t) => !t.deleted || store.S.plants.some((p) => p.tagId === t.id))
        .map((t) => h('option', { value: t.id, selected: t.id === state.tag }, store.tagName(t.id))));
    row2.append(sel);
    head.append(row2);
  }

  function renderLight() {
    const L = currentLight();
    const sun = todaySun();
    clear(lightChip);
    const v = lightView(L);
    lightChip.append(icon(v.icon, 12), h('span', { class: 'light-phase' }, v.label),
      sun.sunrise ? h('span', { class: 'muted light-times' }, `· ${fmtTime(sun.sunrise)}–${fmtTime(sun.sunset)}`) : null);
    const full = sun.sunrise ? `${L.phase}, Sonnenaufgang ${fmtTime(sun.sunrise)}, Sonnenuntergang ${fmtTime(sun.sunset)}` : L.phase;
    lightChip.setAttribute('title', full);
    lightChip.setAttribute('aria-label', full);
    lightChip.classList.toggle('night', L.glow > 0.5);
    return L;
  }

  function update(regionChanged = false) {
    renderHead();
    const plants = filtered();
    const L = renderLight();
    countChip.textContent = plural(plants.length, 'Pflanze');
    const any = store.S.plants.some((p) => p.region === state.region);
    empty.classList.toggle('hidden', plants.length > 0);
    clear(empty).append(h('div', {},
      h('strong', {}, any ? 'Hier ist nichts gewachsen' : `${REGION_BY_ID[state.region].name}: noch leer`),
      h('p', {}, any ? 'In diesem Zeitraum oder für diesen Tag gibt es keine Pflanzen.' : `Lerne mindestens ${CONFIG.growthSteps[0].minutes} Minuten, dann wächst hier deine erste Pflanze.`)));
    if (regionChanged) renderer.userMoved = false;
    renderer.setData(state.region, plants, L);
  }

  function showInfo(it) {
    if (!it) return hideInfo();
    clear(info).append(...plantInfoContent(it.plant, {
      flip: it.flip,
      onClose: () => { renderer.selected = null; renderer.render(); hideInfo(); },
    }));
    info.classList.remove('hidden');
  }
  function hideInfo() {
    info.classList.add('hidden');
  }

  update(true);
  const lightTimer = setInterval(() => renderer.setLight(renderLight()), 60000);
  const off = store.onChange(() => update());
  const onLight = () => renderer.setLight(renderLight());
  window.addEventListener('wurzelwerk:light', onLight);
  return {
    unmount() {
      clearInterval(lightTimer);
      off();
      window.removeEventListener('wurzelwerk:light', onLight);
      renderer.destroy();
    },
  };
}

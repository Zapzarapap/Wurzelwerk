// Garten: Ansicht pro Region, Filter Zeitraum + Tag, Tageszeit-Licht.
import { h, clear, icon, segmented, spriteEl } from '../ui.js';
import * as store from '../store.js';
import { REGIONS, REGION_BY_ID, PLANT_BY_ID, VARIANT_LABELS } from '../plants.js';
import { CONFIG } from '../config.js';
import { GardenRenderer } from '../garden.js';
import { periodRange, shiftAnchor } from '../stats.js';
import { periodLabel, fmtDuration, fmtDate, fmtTime } from '../format.js';
import { currentLight, todaySun } from '../clock.js';

const PERIODS = [['day', 'Tag'], ['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr'], ['all', 'Gesamt']];
const state = { region: null, kind: 'all', anchor: new Date(), tag: '' };

export function mount(root, { navigate, params }) {
  if (params?.region) state.region = params.region;
  if (!state.region || !store.isRegionUnlocked(state.region)) state.region = store.unlockedRegions()[0]?.id || 'pflanzenhandlung';

  const page = h('div', { class: 'page garden' });
  const head = h('div', { class: 'garden-head' });
  const stageWrap = h('div', { class: 'garden-stage' });
  const canvas = h('canvas', { class: 'garden-canvas pix', 'aria-label': 'Garten' });
  const info = h('div', { class: 'plant-info hidden' });
  const lightChip = h('div', { class: 'light-chip' });
  const countChip = h('div', { class: 'count-chip' });
  const empty = h('div', { class: 'garden-empty hidden' });
  const tools = h('div', { class: 'garden-tools' },
    h('button', { class: 'icon-btn glass', 'aria-label': 'Hineinzoomen', onclick: () => renderer.zoomBy(1.5) }, icon('plus', 16)),
    h('button', { class: 'icon-btn glass', 'aria-label': 'Herauszoomen', onclick: () => renderer.zoomBy(1 / 1.5) }, icon('minus', 16)),
    h('button', { class: 'icon-btn glass', 'aria-label': 'Einpassen', onclick: () => renderer.fit() }, icon('fit', 16)),
  );
  stageWrap.append(canvas, tools, lightChip, countChip, empty, info);
  page.append(head, stageWrap);
  root.append(page);

  const renderer = new GardenRenderer(canvas, { onTap: showInfo });

  function filtered() {
    const r = periodRange(state.kind, state.anchor);
    return store.S.plants.filter((p) => p.region === state.region
      && p.createdAt >= +r.start && p.createdAt < +r.end
      && (!state.tag || p.tagId === state.tag));
  }

  function renderHead() {
    clear(head);
    // Regionen
    const regs = h('div', { class: 'region-tabs' });
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
      }, unlocked ? null : icon('lock', 10), r.short));
    }
    head.append(regs);
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
        h('button', { class: 'icon-btn small', 'aria-label': 'Zurück', onclick: () => { state.anchor = shiftAnchor(state.kind, state.anchor, -1); update(); } }, icon('left', 14)),
        h('button', { class: 'mini-title', onclick: () => { state.anchor = new Date(); update(); } }, lbl.title),
        h('button', { class: 'icon-btn small', 'aria-label': 'Weiter', disabled: cur, onclick: () => { state.anchor = shiftAnchor(state.kind, state.anchor, 1); update(); } }, icon('right', 14)),
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
    lightChip.append(icon(L.glow > 0.5 ? 'moon' : 'sun', 12), h('span', {}, L.phase),
      h('span', { class: 'muted' }, sun.sunrise ? ` · ${fmtTime(sun.sunrise)}–${fmtTime(sun.sunset)}` : ''));
    lightChip.classList.toggle('night', L.glow > 0.5);
    return L;
  }

  function update(regionChanged = false) {
    renderHead();
    const plants = filtered();
    const L = renderLight();
    countChip.textContent = `${plants.length} ${plants.length === 1 ? 'Pflanze' : 'Pflanzen'}`;
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
    const p = it.plant;
    const sp = PLANT_BY_ID[p.species];
    clear(info).append(
      spriteEl(p.species, p.stage, p.variant, 2, { flip: it.flip }),
      h('div', { class: 'grow' },
        h('strong', {}, sp?.name || p.species, p.variant ? h('span', { class: 'muted' }, ' · ' + (VARIANT_LABELS[p.variant] || p.variant)) : null),
        h('div', { class: 'muted small' }, `Stufe ${p.stage} · ${fmtDuration(p.minutes * 60000)} · ${fmtDate(p.createdAt)}`),
        h('div', { class: 'small' }, h('span', { class: 'dot', style: { background: store.tagColor(p.tagId) } }), ' ', store.tagName(p.tagId))),
      h('button', { class: 'icon-btn small', 'aria-label': 'Schließen', onclick: () => { renderer.selected = null; renderer.render(); hideInfo(); } }, icon('close', 12)),
    );
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

// Shop-Vorschau (v0.5.3): Sheet mit allen 5 Wachstumsstufen einer Art (pixelgenau, ganzzahlig
// skaliert), Farbvarianten zum Umschalten, Ort, Preis + Lernzeit und Kauf-Button.
// Geht auch für gesperrte Regionen – dann erklärt der Button, dass erst der Ort nötig ist.
import { h, clear, icon, spriteEl, openSheet, toast, regionMarker } from '../ui.js';
import * as store from '../store.js';
import { PLANT_BY_ID, REGION_BY_ID, VARIANT_LABELS } from '../plants.js';
import { CONFIG } from '../config.js';
import { variantsOf } from '../sprites.js';
import { stageMinutes, studyText, buyState, variantSwatch, stripScale } from '../preview.js';
import { fmtDuration } from '../format.js';
import { plural } from '../text.js';

/** Innenbreite des Sheets (max. 520 px, 18 px Rand + 2 px Rahmen je Seite). */
function sheetInner() {
  return Math.min(window.innerWidth || 375, 520) - 40;
}

/** Öffnet die Vorschau. opts.variant: Startvariante. → close() */
export function openPlantPreview(id, { variant } = {}) {
  const plant = PLANT_BY_ID[id];
  if (!plant) return null;
  const variants = variantsOf(id);
  const st = { stage: 5, variant: variants.includes(variant) ? variant : variants[0] || null, busy: false };
  let off = null;
  return openSheet((close) => {
    const body = h('div', { class: 'dialog preview', 'data-species': id });
    const render = () => clear(body).append(...previewContent(plant, variants, st, { close, rerender: render }).filter(Boolean));
    off = store.onChange(render);
    render();
    return body;
  }, { onClose: () => off?.() });
}

function previewContent(plant, variants, st, { close, rerender }) {
  const region = REGION_BY_ID[plant.region];
  const regionUnlocked = store.isRegionUnlocked(plant.region);
  const have = store.unlocked().species.has(plant.id);
  const bal = store.balance();
  const steps = stageMinutes();
  const cur = steps.find((s) => s.stage === st.stage) || steps[steps.length - 1];
  // Große Einzelansicht nur auf hohen Displays – auf kleinen (iPhone SE) passt sonst nicht alles ohne Scrollen.
  const tall = (window.innerHeight || 800) >= 740;

  // Kopf: Name, Ort, Schließen
  const head = h('div', { class: 'pv-head' },
    h('div', { class: 'grow' },
      h('h2', { class: 'pname', id: 'pv-title' }, plant.label),
      h('div', { class: 'pv-region muted' }, regionMarker(plant.region, 1), h('span', {}, region.name),
        regionUnlocked ? null : h('span', { class: 'pv-lock' }, icon('lock', 12), 'gesperrt'))),
    h('button', { class: 'icon-btn small pv-close', 'aria-label': 'Schließen', onclick: () => close() }, icon('close', 24)));

  // Große Ansicht der gewählten Stufe
  const hero = tall ? h('div', { class: 'pv-hero ' + plant.region },
    spriteEl(plant.id, st.stage, st.variant, 4),
    h('div', { class: 'pv-hero-cap' }, `Stufe ${cur.stage} · ab ${fmtDuration(cur.minutes * 60000)}`)) : null;

  // Alle 5 Stufen nebeneinander (antippbar → große Ansicht)
  const sc = stripScale(sheetInner());
  const strip = h('div', { class: 'pv-stages ' + plant.region, role: 'radiogroup', 'aria-label': 'Wachstumsstufen' });
  for (const s of steps) {
    strip.append(h('button', {
      class: 'pv-stage' + (s.stage === st.stage ? ' on' : ''),
      role: 'radio',
      'aria-checked': s.stage === st.stage ? 'true' : 'false',
      'aria-label': `Stufe ${s.stage}, ab ${fmtDuration(s.minutes * 60000)}`,
      onclick: () => { st.stage = s.stage; rerender(); },
    }, spriteEl(plant.id, s.stage, st.variant, sc), h('span', { class: 'pv-min' }, fmtDuration(s.minutes * 60000))));
  }

  // Farbvarianten
  const varBox = variants.length
    ? h('div', { class: 'pv-section' },
      h('h3', {}, plural(variants.length, 'Farbe', 'Farben')),
      h('div', { class: 'chips pv-variants', role: 'radiogroup', 'aria-label': 'Farbvarianten' },
        variants.map((v) => h('button', {
          class: 'chip pv-variant' + (v === st.variant ? ' on' : ''),
          role: 'radio',
          'aria-checked': v === st.variant ? 'true' : 'false',
          onclick: () => { st.variant = v; rerender(); },
        }, h('span', { class: 'swatch-dot', style: { background: variantSwatch(v) } }), h('span', {}, VARIANT_LABELS[v] || v)))))
    : null;

  // Preis + Lernzeit
  const facts = h('div', { class: 'pv-facts' },
    h('div', { class: 'pv-fact' }, h('div', { class: 'label' }, 'Preis'),
      h('div', { class: 'value' }, icon('coin', 12), h('span', {}, plural(plant.price, 'Token')))),
    h('div', { class: 'pv-fact' }, h('div', { class: 'label' }, 'Lernzeit'),
      h('div', { class: 'value' }, h('span', {}, '≈ ' + studyText(plant.price)))));

  // Kauf-Button
  const bs = buyState({
    price: plant.price, have, regionUnlocked, region: plant.region, regionName: region.name,
    regionPrice: CONFIG.regionPrices[plant.region], balance: bal,
  });
  const buyBtn = bs.kind === 'owned'
    ? h('div', { class: 'pv-owned' }, icon('check', 24), bs.label)
    : h('button', {
      class: 'btn pv-buy ' + (bs.enabled ? 'primary' : 'secondary'),
      disabled: !bs.enabled || st.busy,
      onclick: async () => {
        st.busy = true;
        rerender();
        try {
          await store.buy('plant', plant.id);
          toast(`${plant.name} freigeschaltet!`, 2600, { id: 'shop' });
        } catch (e) {
          toast(e.message, 2600, { id: 'shop' });
        } finally {
          st.busy = false;
          rerender();
        }
      },
    }, bs.kind === 'region' ? icon('lock', 12) : icon('coin', 12), h('span', {}, bs.label));

  return [
    head, hero, strip, varBox, facts,
    h('div', { class: 'pv-actions' }, buyBtn, bs.hint ? h('p', { class: 'pv-hint muted' }, bs.hint) : null),
  ];
}

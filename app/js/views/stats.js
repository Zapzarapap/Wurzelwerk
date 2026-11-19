// Statistiken: Tag/Woche/Monat/Jahr, Navigation, Balken, Tag-Aufschlüsselung.
import { h, clear, icon, segmented, spriteEl } from '../ui.js';
import { openSessionSheet } from './sessionsheet.js';
import * as store from '../store.js';
import { aggregate, shiftAnchor, periodRange, tagBreakdown, totalMs, sessionMsIn } from '../stats.js';
import { fmtDuration, fmtTime, periodLabel } from '../format.js';
import { barChart } from '../chart.js';
import { PLANT_BY_ID } from '../plants.js';
import { plural, sessionDayLabel } from '../text.js';

const KIND_LABELS = [['day', 'Tag'], ['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr']];

const state = { kind: 'week', anchor: new Date(), selected: null };

export function mount(root) {
  function render() {
    clear(root);
    const now = new Date();
    const { kind } = state;
    const agg = aggregate(store.S.sessions, kind, state.anchor);
    const prev = aggregate(store.S.sessions, kind, shiftAnchor(kind, state.anchor, -1));
    const isCurrent = +periodRange(kind, now).start === +agg.range.start;
    const isFuture = agg.range.start > now;
    const lbl = periodLabel(kind, state.anchor, now);
    const breakdown = tagBreakdown(agg.byTag);
    const tagOrder = breakdown.map((b) => b.tagId);

    const page = h('div', { class: 'page stats' });
    page.append(h('header', { class: 'topbar' }, h('h1', {}, 'Statistik')));
    page.append(segmented(KIND_LABELS, kind, (k) => {
      state.kind = k;
      state.selected = null;
      render();
    }, 'wide'));

    // Navigation
    const go = (d) => {
      state.anchor = shiftAnchor(kind, state.anchor, d);
      state.selected = null;
      render();
    };
    page.append(h('div', { class: 'period-nav' },
      h('button', { class: 'icon-btn', 'aria-label': 'Zurück', onclick: () => go(-1) }, icon('left', 18)),
      h('button', { class: 'period-title', onclick: () => { state.anchor = new Date(); state.selected = null; render(); } },
        h('div', { class: 't' }, lbl.title), lbl.sub ? h('div', { class: 's' }, lbl.sub) : null),
      h('button', { class: 'icon-btn', 'aria-label': 'Weiter', disabled: isCurrent || isFuture, onclick: () => go(1) }, icon('right', 18)),
    ));

    // Kennzahlen
    const elapsedDays = (() => {
      if (kind === 'day') return 1;
      if (!isCurrent) return agg.days;
      return Math.max(1, Math.ceil((now - agg.range.start) / 86400000));
    })();
    const diff = prev.total ? (agg.total - prev.total) / prev.total : null;
    const prevName = { day: 'Vortag', week: 'Vorwoche', month: 'Vormonat', year: 'Vorjahr' }[kind];
    page.append(h('div', { class: 'kpis' },
      h('div', { class: 'kpi main' },
        h('div', { class: 'label' }, 'Lernzeit'),
        h('div', { class: 'value' }, durParts(agg.total)),
        deltaEl(diff, prev.total, agg.total, prevName)),
      kind === 'day'
        ? kpi('Sessions', String(agg.sessionCount))
        : kpi('Ø pro Tag', durParts(agg.total / elapsedDays)),
      kind === 'day'
        ? kpi('Längste', durParts(longest(agg.range)))
        : kpi('Lerntage', h('span', {}, String(agg.activeDays), h('small', {}, ` von ${elapsedDays}`))),
    ));

    // Diagramm
    const todayIdx = agg.buckets.findIndex((b) => now >= b.start && now < b.end);
    const caption = h('div', { class: 'chart-caption' });
    const setCaption = () => {
      const i = state.selected;
      if (i == null || !agg.buckets[i]) {
        caption.textContent = kind === 'day' ? 'Verteilung über den Tag' : kind === 'year' ? 'pro Monat' : 'pro Tag';
        caption.classList.remove('on');
        return;
      }
      const b = agg.buckets[i];
      const when = kind === 'day' ? `${b.label}–${+b.label + 1} Uhr`
        : kind === 'year' ? b.start.toLocaleDateString('de-DE', { month: 'long' })
          : b.start.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
      caption.textContent = `${when}: ${fmtDuration(b.total)}`;
      caption.classList.add('on');
    };
    const chartBox = h('div', { class: 'card chart-card' }, caption);
    const drawChart = () => {
      chartBox.querySelector('svg')?.remove();
      chartBox.append(barChart(agg.buckets, tagOrder, store.tagColor, {
        kind,
        highlight: todayIdx >= 0 ? todayIdx : null,
        selected: state.selected,
        onSelect: (i) => {
          if (kind !== 'day' && kind !== 'year' && agg.buckets[i].total > 0 && state.selected === i) {
            // zweiter Tipp: in den Tag springen
            state.kind = 'day';
            state.anchor = agg.buckets[i].start;
            state.selected = null;
            return render();
          }
          if (kind === 'year' && state.selected === i) {
            state.kind = 'month';
            state.anchor = agg.buckets[i].start;
            state.selected = null;
            return render();
          }
          state.selected = state.selected === i ? null : i;
          setCaption();
          drawChart();
        },
      }));
    };
    setCaption();
    drawChart();
    page.append(chartBox);

    // Tags
    const tagCard = h('div', { class: 'card tags-card' }, h('h3', {}, 'Nach Tags'));
    if (!breakdown.length) tagCard.append(h('p', { class: 'muted empty' }, isFuture ? 'Das liegt noch in der Zukunft.' : 'In diesem Zeitraum noch nichts gelernt.'));
    for (const b of breakdown) {
      tagCard.append(h('div', { class: 'tag-row', style: { '--tag': store.tagColor(b.tagId) } },
        h('div', { class: 'tag-row-head' },
          h('span', { class: 'dot' }),
          h('span', { class: 'name tname' }, store.tagName(b.tagId)),
          h('span', { class: 'dur' }, fmtDuration(b.ms)),
          h('span', { class: 'pct' }, `${Math.round(b.share * 100)} %`)),
        h('div', { class: 'tag-bar' }, h('div', { style: { width: `${Math.max(1, b.share * 100)}%` } }))));
    }
    page.append(tagCard);

    // Sessions des Tages
    if (kind === 'day') {
      const a = +agg.range.start, e = +agg.range.end;
      const list = store.S.sessions.filter((s) => sessionMsIn(s, a, e) > 0).sort((x, y) => y.startedAt - x.startedAt);
      const card = h('div', { class: 'card sessions-card' }, h('h3', {}, 'Sessions'));
      if (!list.length) card.append(h('p', { class: 'muted empty' }, 'Keine Sessions an diesem Tag.'));
      for (const s of list) {
        const p = store.S.plants.find((x) => x.sessionId === s.id);
        const msDay = sessionMsIn(s, a, e);
        const lbl = sessionDayLabel(s, a, e, msDay, fmtTime, fmtDuration);
        const nPl = s.plantIds?.length || 0;
        card.append(h('button', { class: 'session-row', 'aria-label': `Session ${store.tagName(s.tagId)}, ${lbl.range}: Details, Tag ändern oder löschen`, onclick: () => openSessionSheet(s.id) },
          p ? spriteEl(p.species, p.stage, p.variant, 1) : h('span', { class: 'sprite-empty' }),
          h('div', { class: 'grow' },
            h('div', { class: 'session-tag' }, h('span', { class: 'dot', style: { background: store.tagColor(s.tagId) } }), h('span', { class: 'tname' }, store.tagName(s.tagId))),
            h('div', { class: 'muted small pname' }, lbl.range,
              lbl.part ? h('span', { class: 'part' }, ` · ${lbl.part}`) : ` · ${nPl > 1 ? nPl + '× ' : ''}${PLANT_BY_ID[s.species]?.label || ''}`)),
          h('div', { class: 'dur' + (lbl.part ? ' partial' : '') }, fmtDuration(msDay), lbl.part ? h('div', { class: 'of' }, `von ${fmtDuration(s.minutes * 60000)}`) : null),
          h('span', { class: 'row-chev', 'aria-hidden': 'true' }, icon('right', 12))));
      }
      page.append(card);
    }

    const all = totalMs(store.S.sessions);
    page.append(h('div', { class: 'all-time' },
      h('span', {}, 'Insgesamt gelernt'), h('strong', {}, fmtDuration(all)),
      h('span', { class: 'muted' }, `· ${plural(store.S.sessions.length, 'Session')} · ${plural(store.S.plants.length, 'Pflanze')}`)));

    root.append(page);
  }

  function kpi(label, value) {
    return h('div', { class: 'kpi' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value));
  }

  function longest(range) {
    let best = 0;
    for (const s of store.S.sessions) best = Math.max(best, sessionMsIn(s, +range.start, +range.end));
    return best;
  }

  render();
  const off = store.onChange(render);
  return { unmount: off };
}

/** Dauer als zwei nicht trennbare Teile („1 h“ „23 min“) – bricht nur zwischen den Teilen um. */
function durParts(ms) {
  const parts = fmtDuration(ms).split(/ (?=\d)/);
  return h('span', { class: 'dur-parts' }, parts.map((p) => h('span', { class: 'nowrap' }, p)));
}

/** Vergleich zum Vorzeitraum: ▲ / ▼ / neutral bei 0 %. */
function deltaEl(diff, prevTotal, total, prevName) {
  if (diff == null) {
    return h('div', { class: 'delta' }, prevTotal === 0 && total > 0 ? `neu ggü. ${prevName}` : `${prevName}: –`);
  }
  const pct = Math.round(diff * 100);
  const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'same';
  return h('div', { class: 'delta ' + cls, title: `ggü. ${prevName}` },
    h('span', { class: 'nowrap' }, pct === 0 ? '±0 %' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`), ' ',
    h('span', { class: 'nowrap' }, `ggü. ${prevName}`));
}

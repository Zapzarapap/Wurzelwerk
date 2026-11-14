// Statistiken: Tag/Woche/Monat/Jahr, Navigation, Balken, Tag-Aufschlüsselung.
import { h, clear, icon, segmented, confirmDialog, spriteEl, toast } from '../ui.js';
import * as store from '../store.js';
import { aggregate, shiftAnchor, periodRange, tagBreakdown, totalMs, sessionMsIn } from '../stats.js';
import { fmtDuration, fmtTime, periodLabel, fmtDate } from '../format.js';
import { barChart } from '../chart.js';
import { PLANT_BY_ID } from '../plants.js';

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
        h('div', { class: 'value' }, fmtDuration(agg.total)),
        h('div', { class: 'delta ' + (diff == null ? '' : diff >= 0 ? 'up' : 'down') },
          diff == null ? (prev.total === 0 && agg.total > 0 ? `neu ggü. ${prevName}` : `${prevName}: –`) : `${diff >= 0 ? '+' : ''}${Math.round(diff * 100)} % ggü. ${prevName}`)),
      kind === 'day'
        ? h('div', { class: 'kpi' }, h('div', { class: 'label' }, 'Sessions'), h('div', { class: 'value' }, String(agg.sessionCount)))
        : h('div', { class: 'kpi' }, h('div', { class: 'label' }, 'Ø pro Tag'), h('div', { class: 'value' }, fmtDuration(agg.total / elapsedDays))),
      kind === 'day'
        ? h('div', { class: 'kpi' }, h('div', { class: 'label' }, 'Längste'), h('div', { class: 'value' }, fmtDuration(longest(agg.range))))
        : h('div', { class: 'kpi' }, h('div', { class: 'label' }, 'Lerntage'), h('div', { class: 'value' }, `${agg.activeDays}/${kind === 'year' || kind === 'month' || kind === 'week' ? elapsedDays : agg.days}`)),
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
          h('span', { class: 'name' }, store.tagName(b.tagId)),
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
        card.append(h('div', { class: 'session-row' },
          p ? spriteEl(p.species, p.stage, p.variant, 1) : h('span', { class: 'sprite-empty' }),
          h('div', { class: 'grow' },
            h('div', {}, h('span', { class: 'dot', style: { background: store.tagColor(s.tagId) } }), ' ', store.tagName(s.tagId)),
            h('div', { class: 'muted small' }, `${fmtTime(s.startedAt)}–${fmtTime(s.endedAt)} · ${PLANT_BY_ID[s.species]?.name || ''}${(s.plantIds?.length || 0) > 1 ? ` ×${s.plantIds.length}` : ''}`)),
          h('div', { class: 'dur' }, fmtDuration(sessionMsIn(s, a, e))),
          h('button', {
            class: 'icon-btn small', 'aria-label': 'Session löschen',
            onclick: async () => {
              const ok = await confirmDialog({
                title: 'Session löschen?',
                text: `${fmtDuration(s.minutes * 60000)} vom ${fmtDate(s.startedAt)} und die dabei gewachsenen Pflanzen werden entfernt. Verdiente Tokens werden abgezogen.`,
                ok: 'Löschen', danger: true,
              });
              if (ok) { await store.deleteSession(s.id); toast('Session gelöscht'); }
            },
          }, icon('trash', 14))));
      }
      page.append(card);
    }

    const all = totalMs(store.S.sessions);
    page.append(h('div', { class: 'all-time' },
      h('span', {}, 'Insgesamt gelernt'), h('strong', {}, fmtDuration(all)),
      h('span', { class: 'muted' }, `· ${store.S.sessions.length} Sessions · ${store.S.plants.length} Pflanzen`)));

    root.append(page);
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

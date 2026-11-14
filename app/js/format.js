// Formatierung (Deutsch)
import { periodRange, isoWeek } from './stats.js';

export function fmtDuration(ms, { short = false } = {}) {
  const min = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  if (short) return (min / 60).toFixed(1).replace('.', ',').replace(/,0$/, '') + ' h';
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Kompakt für Achsen: 45m, 2h, 1,5h */
export function fmtAxis(ms) {
  const min = ms / 60000;
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  return (Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')) + 'h';
}

/** Uhr für laufende Sessions: 1:05:09 bzw. 05:09 */
export function fmtClock(ms) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

export function fmtTime(d) {
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(d).toLocaleDateString('de-DE', opts);
}

export function fmtNumber(n) {
  return Math.round(n).toLocaleString('de-DE');
}

export function sameDay(a, b) {
  a = new Date(a); b = new Date(b);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Titel und Untertitel für einen Zeitraum. */
export function periodLabel(kind, anchor, now = new Date()) {
  const r = periodRange(kind, anchor);
  const cur = periodRange(kind, now);
  const isCurrent = +r.start === +cur.start;
  switch (kind) {
    case 'day': {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const title = isCurrent ? 'Heute' : sameDay(r.start, y) ? 'Gestern'
        : r.start.toLocaleDateString('de-DE', { weekday: 'long' });
      return { title, sub: fmtDate(r.start, { day: 'numeric', month: 'long', year: 'numeric' }) };
    }
    case 'week': {
      const last = new Date(r.end - 86400000 / 2);
      const title = isCurrent ? 'Diese Woche' : `KW ${isoWeek(r.start)}`;
      const sub = `${fmtDate(r.start, { day: 'numeric', month: 'short' })} – ${fmtDate(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      return { title, sub: isCurrent ? `KW ${isoWeek(r.start)} · ${sub}` : sub };
    }
    case 'month':
      return {
        title: r.start.toLocaleDateString('de-DE', { month: 'long' }),
        sub: isCurrent ? `Dieser Monat · ${r.start.getFullYear()}` : String(r.start.getFullYear()),
      };
    case 'year':
      return { title: String(r.start.getFullYear()), sub: isCurrent ? 'Dieses Jahr' : '' };
    case 'all':
      return { title: 'Gesamt', sub: '' };
  }
  return { title: '', sub: '' };
}

export function daysAgo(ts, now = Date.now()) {
  return Math.floor((now - ts) / 86400000);
}

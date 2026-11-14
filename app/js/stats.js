// Statistik-Aggregation – rein, lokale Zeit, Woche beginnt Montag.
// Sessions: { tagId, segments: [[startMs, endMs], ...] }

export const KINDS = ['day', 'week', 'month', 'year'];

export function startOfDay(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

export function periodRange(kind, anchor) {
  const a = new Date(anchor);
  const y = a.getFullYear(), m = a.getMonth(), d = a.getDate();
  switch (kind) {
    case 'day':
      return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
    case 'week': {
      const dow = (a.getDay() + 6) % 7; // Mo = 0
      return { start: new Date(y, m, d - dow), end: new Date(y, m, d - dow + 7) };
    }
    case 'month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case 'year':
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
    case 'all':
      return { start: new Date(0), end: new Date(8.64e15) };
    default:
      throw new Error('unbekannter Zeitraum ' + kind);
  }
}

export function shiftAnchor(kind, anchor, delta) {
  const a = new Date(anchor);
  const y = a.getFullYear(), m = a.getMonth(), d = a.getDate();
  switch (kind) {
    case 'day': return new Date(y, m, d + delta);
    case 'week': return new Date(y, m, d + 7 * delta);
    case 'month': return new Date(y, m + delta, Math.min(d, 28));
    case 'year': return new Date(y + delta, m, Math.min(d, 28));
    default: return a;
  }
}

/** Unterteilung eines Zeitraums für das Balkendiagramm. */
export function bucketsFor(kind, range) {
  const out = [];
  const s = range.start;
  const y = s.getFullYear(), m = s.getMonth(), d = s.getDate();
  if (kind === 'day') {
    for (let h = 0; h < 24; h++) out.push({ start: new Date(y, m, d, h), end: new Date(y, m, d, h + 1), label: String(h) });
  } else if (kind === 'week') {
    const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    for (let i = 0; i < 7; i++) out.push({ start: new Date(y, m, d + i), end: new Date(y, m, d + i + 1), label: names[i] });
  } else if (kind === 'month') {
    const n = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= n; i++) out.push({ start: new Date(y, m, i), end: new Date(y, m, i + 1), label: String(i) });
  } else if (kind === 'year') {
    const names = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    for (let i = 0; i < 12; i++) out.push({ start: new Date(y, i, 1), end: new Date(y, i + 1, 1), label: names[i] });
  }
  return out;
}

export function overlap(s, e, a, b) {
  return Math.max(0, Math.min(e, b) - Math.max(s, a));
}

/** Lernzeit (ms) einer Session innerhalb [a, b). */
export function sessionMsIn(session, a, b) {
  let t = 0;
  for (const [s, e] of session.segments) t += overlap(s, e, a, b);
  return t;
}

/**
 * Aggregiert Sessions für einen Zeitraum.
 * → { kind, range, buckets: [{start, end, label, total, byTag}], byTag: {tagId: ms},
 *     total, activeDays, sessionCount, days }
 */
export function aggregate(sessions, kind, anchor) {
  const range = periodRange(kind, anchor);
  const a = +range.start, b = +range.end;
  const buckets = bucketsFor(kind, range).map((x) => ({ ...x, total: 0, byTag: {} }));
  const byTag = {};
  let total = 0, sessionCount = 0;
  const dayTotals = new Map();

  for (const sess of sessions) {
    const ms = sessionMsIn(sess, a, b);
    if (ms <= 0) continue;
    sessionCount++;
    total += ms;
    const tag = sess.tagId ?? '';
    byTag[tag] = (byTag[tag] || 0) + ms;
    for (const bk of buckets) {
      const v = sessionMsIn(sess, +bk.start, +bk.end);
      if (v > 0) {
        bk.total += v;
        bk.byTag[tag] = (bk.byTag[tag] || 0) + v;
      }
    }
    // aktive Tage zählen (über Tagesgrenzen korrekt)
    for (const [s, e] of sess.segments) {
      let t = Math.max(s, a);
      const end = Math.min(e, b);
      while (t < end) {
        const ds = startOfDay(t);
        const de = new Date(ds.getFullYear(), ds.getMonth(), ds.getDate() + 1);
        const v = Math.min(end, +de) - t;
        dayTotals.set(+ds, (dayTotals.get(+ds) || 0) + v);
        t = +de;
      }
    }
  }
  // Anzahl Kalendertage im Zeitraum (DST-sicher)
  let days = 0;
  if (kind !== 'all') {
    for (let d = new Date(range.start); d < range.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days++;
  }
  return { kind, range, buckets, byTag, total, activeDays: dayTotals.size, sessionCount, days };
}

/** Summe aller Sessions (gesamt). */
export function totalMs(sessions) {
  let t = 0;
  for (const s of sessions) for (const [a, b] of s.segments) t += b - a;
  return t;
}

/** Tag-Aufschlüsselung sortiert: [{tagId, ms, share}] */
export function tagBreakdown(byTag) {
  const total = Object.values(byTag).reduce((x, y) => x + y, 0);
  return Object.entries(byTag)
    .map(([tagId, ms]) => ({ tagId, ms, share: total ? ms / total : 0 }))
    .sort((p, q) => q.ms - p.ms);
}

/** ISO-Kalenderwoche */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/** Aktuelle Serie: aufeinanderfolgende Tage mit Lernzeit bis heute (oder gestern). */
export function streak(sessions, now) {
  const days = new Set();
  for (const s of sessions) for (const [a, b] of s.segments) {
    for (let t = +startOfDay(a); t < b; t = +new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate() + 1)) days.add(t);
  }
  let d = startOfDay(now);
  if (!days.has(+d)) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  let n = 0;
  while (days.has(+d)) {
    n++;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  }
  return n;
}

// Texte: Pluralisierung und Zusammenfassungen – rein, ohne Browser (getestet in app/tests).

const FORMS = {
  Session: 'Sessions',
  Pflanze: 'Pflanzen',
  Tag: 'Tage',
  Token: 'Tokens',
  Art: 'Arten',
  Minute: 'Minuten',
  Stunde: 'Stunden',
  Lerntag: 'Lerntage',
};

/** plural(1, 'Pflanze') → '1 Pflanze', plural(2, 'Pflanze') → '2 Pflanzen'. */
export function plural(n, one, many = FORMS[one] || one + 'e') {
  const num = typeof n === 'number' ? n.toLocaleString('de-DE') : String(n);
  return `${num} ${Math.abs(n) === 1 ? one : many}`;
}

/** Dativ „vor X Tagen“: vor 1 Tag, vor 3 Tagen. */
export function daysAgoText(n) {
  if (n <= 0) return 'heute';
  if (n === 1) return 'gestern';
  return `vor ${n} Tagen`;
}

/**
 * Gruppiert gleiche Pflanzen: [{species, stage}] → '2× Monstera Stufe 5 · Monstera Stufe 1'
 * names: species → Anzeigename
 */
export function plantSummary(plants, names = {}) {
  const groups = [];
  for (const p of plants) {
    const key = `${p.species}|${p.stage}`;
    const g = groups.find((x) => x.key === key);
    if (g) g.n++;
    else groups.push({ key, n: 1, name: names[p.species] || p.species, stage: p.stage });
  }
  return groups.map((g) => `${g.n > 1 ? g.n + '× ' : ''}${g.name} Stufe ${g.stage}`).join(' · ');
}

/**
 * Zeitangabe einer Session in der Tagesliste. Wenn die Session über
 * Mitternacht läuft, steht dabei, wie viel davon an diesem Tag zählt.
 * → { range: '23:30–00:45', part: '45 min an diesem Tag' | null }
 */
export function sessionDayLabel(session, dayStart, dayEnd, msInDay, fmtTime, fmtDuration) {
  const range = `${fmtTime(session.startedAt)}–${fmtTime(session.endedAt)}`;
  const crosses = session.startedAt < dayStart || session.endedAt > dayEnd;
  return { range, part: crosses ? `${fmtDuration(msInDay)} an diesem Tag` : null };
}

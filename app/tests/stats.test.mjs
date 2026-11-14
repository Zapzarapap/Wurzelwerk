process.env.TZ = 'Europe/Berlin';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, periodRange, shiftAnchor, tagBreakdown, isoWeek, streak, totalMs } from '../js/stats.js';
import { fmtDuration } from '../js/format.js';

const H = 3600000, M = 60000;
const L = (y, mo, d, h = 0, mi = 0) => +new Date(y, mo - 1, d, h, mi);

const sessions = [
  { tagId: 'uni', segments: [[L(2026, 11, 10, 9), L(2026, 11, 10, 10, 30)]] }, // Di 90 min
  { tagId: 'ba', segments: [[L(2026, 11, 12, 14), L(2026, 11, 12, 15)], [L(2026, 11, 12, 15, 30), L(2026, 11, 12, 16)]] }, // Do 90
  { tagId: 'uni', segments: [[L(2026, 11, 15, 23), L(2026, 11, 16, 1)]] }, // So 23:00 → Mo 01:00 über Wochengrenze
  { tagId: 'ba', segments: [[L(2026, 10, 31, 20), L(2026, 10, 31, 21)]] }, // Oktober
];

test('Wochenbereich beginnt Montag', () => {
  const r = periodRange('week', new Date(2026, 10, 14));
  assert.equal(r.start.getDay(), 1);
  assert.equal(+r.start, L(2026, 11, 9));
  assert.equal(+r.end, L(2026, 11, 16));
});

test('Woche: Summen, Buckets, Tags', () => {
  const a = aggregate(sessions, 'week', new Date(2026, 10, 14));
  assert.equal(a.total, 240 * M);
  assert.equal(a.buckets.length, 7);
  assert.equal(a.buckets[1].total, 90 * M); // Di
  assert.equal(a.buckets[3].byTag.ba, 90 * M); // Do
  assert.equal(a.buckets[6].total, 60 * M); // So
  assert.equal(a.activeDays, 3);
  assert.equal(a.sessionCount, 3);
  const tb = tagBreakdown(a.byTag);
  assert.equal(tb.length, 2);
  assert.equal(tb[0].tagId, 'uni');
  assert.equal(tb[0].share, 150 / 240);
});

test('Session über Mitternacht wird auf Tage/Wochen aufgeteilt', () => {
  const sun = aggregate(sessions, 'day', new Date(2026, 10, 15));
  assert.equal(sun.total, 1 * H);
  assert.equal(sun.buckets[23].total, 1 * H);
  const mon = aggregate(sessions, 'day', new Date(2026, 10, 16));
  assert.equal(mon.total, 1 * H);
  assert.equal(mon.buckets[0].total, 1 * H);
  const nextWeek = aggregate(sessions, 'week', new Date(2026, 10, 17));
  assert.equal(nextWeek.total, 1 * H);
});

test('Monat und Jahr', () => {
  const nov = aggregate(sessions, 'month', new Date(2026, 10, 1));
  assert.equal(nov.buckets.length, 30);
  assert.equal(nov.total, 300 * M);
  const okt = aggregate(sessions, 'month', shiftAnchor('month', new Date(2026, 10, 30), -1));
  assert.equal(okt.total, 60 * M);
  assert.equal(okt.days, 31);
  const y = aggregate(sessions, 'year', new Date(2026, 5, 1));
  assert.equal(y.buckets.length, 12);
  assert.equal(y.total, 360 * M);
  assert.equal(y.buckets[9].total, 60 * M);
  assert.equal(y.buckets[10].total, 300 * M);
  assert.equal(totalMs(sessions), 360 * M);
});

test('Zeitumstellung: Tag mit 25 Stunden', () => {
  const r = periodRange('day', new Date(2026, 9, 25)); // 25.10.2026 Ende Sommerzeit
  assert.equal((r.end - r.start) / H, 25);
  const a = aggregate([{ tagId: 'x', segments: [[L(2026, 10, 25, 0), L(2026, 10, 25, 23, 59)]] }], 'day', new Date(2026, 9, 25));
  assert.equal(Math.round(a.total / M), 24 * 60 + 59);
});

test('shiftAnchor am Monatsende', () => {
  const d = shiftAnchor('month', new Date(2026, 0, 31), 1);
  assert.equal(d.getMonth(), 1);
});

test('ISO-Woche und Serie', () => {
  assert.equal(isoWeek(new Date(2026, 10, 14)), 46);
  assert.equal(isoWeek(new Date(2027, 0, 1)), 53);
  const s = [
    { segments: [[L(2026, 11, 12, 9), L(2026, 11, 12, 10)]] },
    { segments: [[L(2026, 11, 13, 9), L(2026, 11, 13, 10)]] },
    { segments: [[L(2026, 11, 14, 9), L(2026, 11, 14, 10)]] },
  ];
  assert.equal(streak(s, new Date(2026, 10, 14, 20)), 3);
  assert.equal(streak(s, new Date(2026, 10, 15, 8)), 3); // heute noch nichts → ab gestern
  assert.equal(streak(s, new Date(2026, 10, 16, 8)), 0);
});

test('fmtDuration', () => {
  assert.equal(fmtDuration(45 * M), '45 min');
  assert.equal(fmtDuration(120 * M), '2 h');
  assert.equal(fmtDuration(135 * M), '2 h 15 min');
  assert.equal(fmtDuration(90 * M, { short: true }), '1,5 h');
  assert.equal(fmtDuration(120 * M, { short: true }), '2 h');
});

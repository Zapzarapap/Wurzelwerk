import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunTimes, sunElevation, lightFromElevation, lightAt } from '../js/sun.js';

const LAT = 51.0, LON = 10.0;
const near = (date, utcH, utcM, tolMin = 6) => {
  const d = new Date(date);
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  assert.ok(Math.abs(mins - (utcH * 60 + utcM)) <= tolMin, `${d.toISOString()} ≉ ${utcH}:${utcM} UTC`);
};

// Referenz (NOAA-Rechner, 51°N 10°E): 21.06. Aufgang ~03:00 UTC, Untergang ~19:34 UTC
//                                     21.12. Aufgang ~07:16 UTC, Untergang ~15:08 UTC
test('Sonnenzeiten Sommer', () => {
  const t = sunTimes(new Date(2026, 5, 21, 12), LAT, LON);
  near(t.sunrise, 3, 0, 8);
  near(t.sunset, 19, 34, 8);
});

test('Sonnenzeiten Winter (früher dunkel)', () => {
  const t = sunTimes(new Date(2026, 11, 21, 12), LAT, LON);
  near(t.sunrise, 7, 16, 8);
  near(t.sunset, 15, 8, 8);
  const s = sunTimes(new Date(2026, 5, 21, 12), LAT, LON);
  const dayLen = (x) => (x.sunset - x.sunrise) / 3600000;
  assert.ok(dayLen(s) > 16 && dayLen(s) < 17);
  assert.ok(dayLen(t) > 7.5 && dayLen(t) < 8.3);
});

test('Sonnenhöhe: Mittag Sommer ~62°, Mitternacht negativ', () => {
  const noon = sunTimes(new Date(2026, 5, 21, 12), LAT, LON).noon;
  const e = sunElevation(noon, LAT, LON);
  assert.ok(e > 61 && e < 63.5, String(e));
  assert.ok(sunElevation(new Date(Date.UTC(2026, 5, 21, 23, 20)), LAT, LON) < -10);
  const t = sunTimes(new Date(2026, 2, 20, 12), LAT, LON);
  assert.ok(Math.abs(sunElevation(t.sunrise, LAT, LON) + 0.83) < 0.3);
});

test('Licht-Grading: Tag neutral, Nacht dunkel mit Glow, fließend', () => {
  const day = lightFromElevation(40, false);
  assert.ok(day.mult.every((c) => c >= 245), String(day.mult));
  assert.equal(day.glow, 0);
  const night = lightFromElevation(-25, false);
  assert.ok(night.mult.reduce((a, c) => a + c, 0) / 3 < 130, "Nacht deutlich dunkler");
  assert.ok(night.mult[2] > night.mult[0], "Nacht bläulich");
  assert.equal(night.glow, 1);
  assert.equal(night.phase, 'Nacht');
  assert.equal(lightFromElevation(2, false).phase, 'Abendrot');
  assert.equal(lightFromElevation(2, true).phase, 'Morgendämmerung');
  // keine Sprünge: benachbarte Höhen liefern ähnliche Farben
  for (let e = -20; e < 20; e += 0.25) {
    const a = lightFromElevation(e, false).mult, b = lightFromElevation(e + 0.25, false).mult;
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(a[k] - b[k]) < 12, `Sprung bei ${e}°`);
  }
});

test('lightAt: Winterabend 17:00 MEZ ist dunkel, Sommer 17:00 MESZ hell', () => {
  const winter = lightAt(new Date(Date.UTC(2026, 11, 10, 16, 0)), LAT, LON);
  assert.ok(winter.glow > 0.5);
  const summer = lightAt(new Date(Date.UTC(2026, 5, 10, 15, 0)), LAT, LON);
  assert.equal(summer.glow, 0);
});

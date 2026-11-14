// Zeitquelle für das Tageszeit-Licht. Erlaubt eine Vorschau (Einstellungen)
// oder ?zeit=HH:MM in der URL zum Testen.
import { CONFIG } from './config.js';
import { lightAt, sunTimes } from './sun.js';

let overrideMin = null;

export function setLightOverride(min) {
  overrideMin = min;
}

export function getLightOverride() {
  return overrideMin;
}

export function lightDate() {
  const now = new Date();
  let min = overrideMin;
  if (min == null) {
    const p = new URLSearchParams(location.search).get('zeit');
    const m = p && /^(\d{1,2}):(\d{2})$/.exec(p);
    if (m) min = +m[1] * 60 + +m[2];
  }
  if (min == null) return now;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(min / 60), min % 60);
}

export function currentLight() {
  const { lat, lon } = CONFIG.location;
  return lightAt(lightDate(), lat, lon);
}

export function todaySun() {
  const { lat, lon } = CONFIG.location;
  return sunTimes(lightDate(), lat, lon);
}

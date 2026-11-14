// Sonnenstand offline (NOAA-Näherung) + Farb-Grading für Tageszeit-Licht.
// Rein, ohne Browser-Abhängigkeiten.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function solarParams(ms) {
  const jd = ms / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360) + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * M * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eot = 4 * DEG * (
    y * Math.sin(2 * L0 * RAD)
    - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD)
    - 1.25 * e * e * Math.sin(2 * M * RAD)
  );
  return { decl, eot };
}

/** Sonnenhöhe in Grad zum Zeitpunkt date. */
export function sunElevation(date, lat, lon) {
  const ms = +date;
  const { decl, eot } = solarParams(ms);
  const d = new Date(ms);
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  let tst = (utcMin + eot + 4 * lon) % 1440;
  if (tst < 0) tst += 1440;
  const ha = tst / 4 - 180;
  const cosZ = Math.sin(lat * RAD) * Math.sin(decl * RAD) + Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(ha * RAD);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) * DEG;
}

/**
 * Sonnenaufgang, -untergang und Mittag für den (lokalen) Kalendertag von date.
 * → { sunrise: Date|null, sunset: Date|null, noon: Date }
 */
export function sunTimes(date, lat, lon) {
  const d = new Date(date);
  const base = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const { decl, eot } = solarParams(base + 12 * 3600000);
  const noonMin = 720 - 4 * lon - eot;
  const cosH = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl * RAD)) - Math.tan(lat * RAD) * Math.tan(decl * RAD);
  const noon = new Date(base + noonMin * 60000);
  if (cosH > 1 || cosH < -1) return { sunrise: null, sunset: null, noon };
  const H = Math.acos(cosH) * DEG;
  return {
    sunrise: new Date(base + (noonMin - 4 * H) * 60000),
    sunset: new Date(base + (noonMin + 4 * H) * 60000),
    noon,
  };
}

// --- Licht-Grading -----------------------------------------------------------
// Keyframes über der Sonnenhöhe (Grad). mult = Multiplikationsfarbe für die
// Szene, sky = Himmelsfarbe für Fenster/Glasdach.
const EVENING = [
  { e: -18, mult: [92, 98, 150], sky: [16, 18, 44] },
  { e: -12, mult: [100, 104, 156], sky: [24, 28, 64] },
  { e: -7, mult: [140, 126, 178], sky: [60, 62, 120] },
  { e: -3, mult: [196, 128, 136], sky: [178, 96, 110] },
  { e: 1, mult: [255, 190, 142], sky: [246, 160, 106] },
  { e: 6, mult: [255, 228, 196], sky: [250, 206, 150] },
  { e: 12, mult: [255, 254, 250], sky: [160, 206, 236] },
  { e: 20, mult: [255, 255, 255], sky: [140, 196, 236] },
];
const MORNING = [
  { e: -18, mult: [92, 98, 150], sky: [16, 18, 44] },
  { e: -12, mult: [100, 104, 156], sky: [24, 28, 64] },
  { e: -7, mult: [144, 132, 184], sky: [72, 72, 134] },
  { e: -3, mult: [196, 150, 182], sky: [196, 140, 176] },
  { e: 1, mult: [255, 206, 186], sky: [250, 184, 160] },
  { e: 6, mult: [255, 236, 214], sky: [236, 214, 196] },
  { e: 12, mult: [255, 254, 252], sky: [160, 206, 236] },
  { e: 20, mult: [255, 255, 255], sky: [140, 196, 236] },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

function sample(frames, e, key) {
  if (e <= frames[0].e) return frames[0][key].slice();
  for (let i = 1; i < frames.length; i++) {
    if (e <= frames[i].e) {
      const a = frames[i - 1], b = frames[i];
      const t = smooth((e - a.e) / (b.e - a.e));
      return a[key].map((v, k) => Math.round(lerp(v, b[key][k], t)));
    }
  }
  return frames[frames.length - 1][key].slice();
}

/**
 * Lichtzustand aus Sonnenhöhe.
 * morning: true vor dem Sonnenhöchststand (Morgendämmerung statt Abendrot)
 * → { mult: [r,g,b], sky: [r,g,b], glow: 0..1, phase }
 */
export function lightFromElevation(e, morning) {
  const frames = morning ? MORNING : EVENING;
  const mult = sample(frames, e, 'mult');
  const sky = sample(frames, e, 'sky');
  const glow = smooth((2 - e) / 10); // 0 bei ≥ 2°, 1 bei ≤ -8°
  let phase;
  if (e >= 8) phase = 'Tag';
  else if (e >= -6) phase = morning ? 'Morgendämmerung' : 'Abendrot';
  else if (e >= -12) phase = 'Dämmerung';
  else phase = 'Nacht';
  return { mult, sky, glow, phase, elevation: e };
}

export function lightAt(date, lat, lon) {
  const e = sunElevation(date, lat, lon);
  const { noon } = sunTimes(date, lat, lon);
  return lightFromElevation(e, +date < +noon);
}

// Service Worker: App-Shell cache-first aus versioniertem Cache, Sprites
// cache-first, sprites.json network-first. Bei Releases VERSION erhöhen
// (muss zu js/version.js passen – wird in app/tests geprüft).
//
// Update-Fluss (ab 0.5.2): Ein neuer SW lädt seinen Cache vollständig und wartet.
// Die Seite zeigt „Neue Version verfügbar – Neu laden“; Antippen schickt
// {type: 'SKIP_WAITING'} → aktivieren → die Seite lädt neu (controllerchange).
// Beim nächsten Kaltstart aktiviert main.js einen wartenden SW automatisch.
// Alle Daten liegen in IndexedDB (auch eine laufende Session) → kein Datenverlust.
// Ausnahme: Läuft noch eine Version vor 0.5.2 (kennt die Nachricht nicht),
// aktiviert sich der neue SW wie früher sofort.
const VERSION = '0.5.2';
const CACHE = 'wurzelwerk-' + VERSION;

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon-32.png',
  'icons/favicon.svg',
  'icons/splash/splash-1125x2436.png',
  'icons/splash/splash-1170x2532.png',
  'icons/splash/splash-1179x2556.png',
  'icons/splash/splash-1206x2622.png',
  'icons/splash/splash-1242x2208.png',
  'icons/splash/splash-1242x2688.png',
  'icons/splash/splash-1284x2778.png',
  'icons/splash/splash-1290x2796.png',
  'icons/splash/splash-1320x2868.png',
  'icons/splash/splash-750x1334.png',
  'icons/splash/splash-828x1792.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'data/sprites.json',
  'js/main.js',
  'js/version.js',
  'js/config.js',
  'js/plants.js',
  'js/db.js',
  'js/store.js',
  'js/growth.js',
  'js/sessionlogic.js',
  'js/stats.js',
  'js/format.js',
  'js/text.js',
  'js/backup.js',
  'js/sun.js',
  'js/clock.js',
  'js/palette.js',
  'js/pixelart.js',
  'js/sprites.js',
  'js/scenekit/rng.js',
  'js/scenekit/draw.js',
  'js/scenekit/engine.js',
  'js/scenekit/light.js',
  'js/scenekit/props.js',
  'js/scenes/index.js',
  'js/scenes/pflanzenhandlung.js',
  'js/scenes/gewaechshaus.js',
  'js/scenes/blumenwiese.js',
  'js/scenes/wald.js',
  'js/garden.js',
  'js/chart.js',
  'js/ui.js',
  'js/views/learn.js',
  'js/views/stats.js',
  'js/views/garden.js',
  'js/views/shop.js',
  'js/views/settings.js',
  'js/views/tageditor.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })));
    // Vorhandene Sprites vorab laden (Fehler ignorieren)
    try {
      const res = await cache.match('data/sprites.json');
      const m = await res.json();
      const urls = [];
      for (const [species, s] of Object.entries(m.species || {}))
        for (const f of s.files) urls.push(`../art/sprites/${s.region}/${species}/${f}.png`);
      await Promise.allSettled(urls.map((u) => cache.add(u)));
    } catch { /* egal */ }
    if (await legacyActive()) await self.skipWaiting();
  })());
});

/** Läuft gerade eine App-Version ohne SKIP_WAITING-Nachricht (≤ 0.5.1)? */
async function legacyActive() {
  const older = (await caches.keys())
    .filter((k) => k.startsWith('wurzelwerk-') && k !== CACHE)
    .map((k) => k.slice('wurzelwerk-'.length).split('.').map(Number));
  return older.some(([a = 0, b = 0, c = 0]) => a * 1e6 + b * 1e3 + c < 5002);
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('wurzelwerk-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.endsWith('/data/sprites.json')) {
    event.respondWith(networkFirst(req));
  } else if (url.pathname.includes('/art/sprites/')) {
    event.respondWith(cacheFirst(req, true));
  } else {
    event.respondWith(cacheFirst(req, false));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || Response.error();
  }
}

async function cacheFirst(req, store) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
  if (hit) return hit;
  if (req.mode === 'navigate') {
    const shell = await cache.match('index.html');
    try {
      const res = await fetch(req);
      return res;
    } catch {
      if (shell) return shell;
      throw new Error('offline');
    }
  }
  const res = await fetch(req);
  if (store && res.ok) cache.put(req, res.clone());
  return res;
}

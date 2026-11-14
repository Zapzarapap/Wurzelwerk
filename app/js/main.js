// Einstieg: Store laden, Service Worker, Router, Tab-Leiste.
import * as store from './store.js';
import { loadManifest } from './sprites.js';
import { h, icon, clear, toast } from './ui.js';
import { timerDone } from './sessionlogic.js';
import { showResult, chime } from './views/learn.js';
import * as learn from './views/learn.js';
import * as stats from './views/stats.js';
import * as garden from './views/garden.js';
import * as shop from './views/shop.js';
import * as settings from './views/settings.js';

// Interne Routen-IDs (garten/laden) bleiben für alte Links, die Beschriftung heißt Orte/Shop.
const ROUTES = {
  lernen: { view: learn, label: 'Lernen', icon: 'learn' },
  statistik: { view: stats, label: 'Statistik', icon: 'stats' },
  garten: { view: garden, label: 'Orte', icon: 'garden' },
  laden: { view: shop, label: 'Shop', icon: 'shop' },
  einstellungen: { view: settings, label: 'Mehr', icon: 'settings' },
};

let current = null;
let routeParams = null;
const main = document.getElementById('main');
const tabbar = document.getElementById('tabbar');

export function navigate(route, params = null) {
  routeParams = params;
  if (location.hash === '#/' + route) show(route);
  else location.hash = '#/' + route;
}

function show(route) {
  if (!ROUTES[route]) route = 'lernen';
  current?.instance?.unmount?.();
  clear(main);
  main.dataset.route = route;
  document.body.dataset.route = route;
  main.scrollTop = 0;
  const instance = ROUTES[route].view.mount(main, { navigate, params: routeParams });
  routeParams = null;
  current = { route, instance };
  for (const b of tabbar.querySelectorAll('button')) b.classList.toggle('on', b.dataset.route === route);
  updateBadge();
}

function buildTabbar() {
  for (const [id, r] of Object.entries(ROUTES)) {
    tabbar.append(h('button', { 'data-route': id, onclick: () => navigate(id) }, icon(r.icon, 22), h('span', {}, r.label)));
  }
}

function updateBadge() {
  const b = tabbar.querySelector('[data-route="lernen"]');
  b?.classList.toggle('running', !!store.active());
}

/** Timer, die im Hintergrund abgelaufen sind, abschließen – egal welche Ansicht offen ist. */
async function checkTimer() {
  const a = store.active();
  if (!a || !timerDone(a, Date.now())) return;
  const res = await store.finishActive(Date.now());
  if (res && !res.shown) {
    res.shown = true;
    if (!document.hidden) chime();
    showResult(res, navigate);
  }
}

async function boot() {
  buildTabbar();
  try {
    await store.init();
  } catch (e) {
    main.append(h('div', { class: 'page' }, h('h1', {}, 'Speicher nicht verfügbar'),
      h('p', {}, 'Wurzelwerk braucht IndexedDB. Im privaten Modus von Safari ist das teilweise gesperrt.'), h('pre', {}, String(e))));
    return;
  }
  await loadManifest();
  try { await navigator.storage?.persist?.(); } catch { /* optional */ }

  store.onChange(updateBadge);
  window.addEventListener('hashchange', () => show(location.hash.replace('#/', '')));
  show(location.hash.replace('#/', '') || (store.active() ? 'lernen' : 'lernen'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkTimer(); });
  setInterval(checkTimer, 5000);
  checkTimer();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Update geladen – beim nächsten Start aktiv.');
        });
      });
    }).catch(() => {});
  }
}

boot();

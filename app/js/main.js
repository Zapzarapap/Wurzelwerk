// Einstieg: Store laden, Service Worker, Router, Tab-Leiste.
import * as store from './store.js';
import { loadManifest } from './sprites.js';
import { h, icon, clear, toast } from './ui.js';
import { timerDone } from './sessionlogic.js';
import { showResult, chime, startSession } from './views/learn.js';
import { backupStatus } from './backup.js';
import { CONFIG } from './config.js';
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
  const m = tabbar.querySelector('[data-route="einstellungen"]');
  const due = backupStatus(store.S.kv, store.S.sessions.length, Date.now(), CONFIG.backupReminderDays).due;
  m?.classList.toggle('badge', due);
  m?.setAttribute('aria-label', due ? 'Mehr – Backup empfohlen' : 'Mehr');
}

/** Shortcut „Session starten“ aus dem Manifest: ?aktion=start */
async function handleShortcut() {
  const q = new URLSearchParams(location.search);
  if (q.get('aktion') !== 'start') return;
  history.replaceState(null, '', location.pathname + '#/lernen');
  if (store.active()) { toast('Es läuft schon eine Session.'); return; }
  if (await startSession()) toast('Session gestartet');
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
  if (await registerSW()) return; // lädt gerade mit neuer Version neu
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
  show(location.hash.replace('#/', '') || 'lernen');
  await handleShortcut();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkTimer(); });
  setInterval(checkTimer, 5000);
  checkTimer();

}

// --- Updates (Service Worker, siehe sw.js) -----------------------------------
let reloading = false;
let wantReload = false; // nur neu laden, wenn der Wechsel angefordert wurde (Start oder „Neu laden“)
function activateUpdate(w) {
  if (!w) return;
  wantReload = true;
  try { sessionStorage.setItem('ww-update-at', String(Date.now())); } catch { /* egal */ }
  w.postMessage({ type: 'SKIP_WAITING' });
}

function offerUpdate(w) {
  toast('Neue Version verfügbar', Infinity, { id: 'update', action: { label: 'Neu laden', onClick: () => activateUpdate(w) } });
}

function watchUpdates(reg) {
  const track = (w) => w?.addEventListener('statechange', () => {
    if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
  });
  if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
  track(reg.installing);
  reg.addEventListener('updatefound', () => track(reg.installing));
  // iOS hält die App lange im Speicher: beim Zurückkehren nach Updates sehen (höchstens alle 10 min)
  let last = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || Date.now() - last < 600000) return;
    last = Date.now();
    reg.update().catch(() => {});
  });
}

/**
 * Service Worker registrieren. Wartet beim Start schon eine neue Version, wird sie
 * gleich aktiviert und die Seite neu geladen (Kaltstart, noch nichts angezeigt) –
 * so läuft schon der erste Neustart nach einem Update mit der neuen Version.
 * → true, wenn neu geladen wird (dann nicht weiter starten).
 */
async function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    if (!wantReload) {
      // z. B. in einem anderen Fenster aktiviert: nicht ungefragt neu laden
      toast('Neue Version aktiv', Infinity, { id: 'update', action: { label: 'Neu laden', onClick: () => location.reload() } });
      return;
    }
    reloading = true;
    location.reload();
  });
  if (!navigator.serviceWorker.controller) {
    // Erster Besuch (bzw. ohne aktiven SW): nicht auf die Registrierung warten
    navigator.serviceWorker.register('./sw.js').then(watchUpdates).catch(() => {});
    return false;
  }
  let reg;
  try { reg = await navigator.serviceWorker.register('./sw.js'); } catch { return false; }
  let recent = 0;
  try { recent = Date.now() - Number(sessionStorage.getItem('ww-update-at') || 0); } catch { /* egal */ }
  if (reg.waiting && navigator.serviceWorker.controller && recent > 15000) {
    // Nachricht wiederholen, bis der SW übernimmt (sie kann beim Kaltstart verloren gehen);
    // reagiert er nicht, nach 2,5 s normal weiter starten.
    const w = reg.waiting;
    const switched = await new Promise((res) => {
      const iv = setInterval(() => (reg.waiting === w ? w.postMessage({ type: 'SKIP_WAITING' }) : null), 400);
      const t = setTimeout(() => { clearInterval(iv); wantReload = false; res(false); }, 2500);
      navigator.serviceWorker.addEventListener('controllerchange', () => { clearInterval(iv); clearTimeout(t); res(true); }, { once: true });
      activateUpdate(w);
    });
    if (switched) return true;
  }
  watchUpdates(reg);
  return false;
}

boot();

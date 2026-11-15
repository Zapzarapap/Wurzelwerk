// Shop: Regionen und Pflanzen mit Tokens freischalten.
import { h, clear, icon, spriteEl, confirmDialog, toast, joinNames, tokenBadge, regionMarker } from '../ui.js';
import { plural } from '../text.js';
import * as store from '../store.js';
import { REGIONS, plantsOfRegion, PLANT_BY_ID } from '../plants.js';
import { CONFIG } from '../config.js';
import { hasRealSprites } from '../sprites.js';

export function mount(root) {
  function render() {
    clear(root);
    const bal = store.balance();
    const page = h('div', { class: 'page shop' });
    page.append(h('header', { class: 'topbar' }, h('h1', {}, 'Shop'), tokenBadge(bal)));
    page.append(h('p', { class: 'muted intro' },
      `Jede Lernminute bringt ${plural(CONFIG.tokensPerMinute, 'Token')}. Verdient: ${store.tokensEarned().toLocaleString('de-DE')} · ausgegeben: ${store.tokensSpent().toLocaleString('de-DE')}`));

    for (const r of REGIONS) {
      const unlocked = store.isRegionUnlocked(r.id);
      const price = CONFIG.regionPrices[r.id];
      const card = h('section', { class: 'card shop-region ' + r.id + (unlocked ? '' : ' locked') });
      const incl = (CONFIG.includedWithRegion[r.id] || []).map((id) => PLANT_BY_ID[id]?.name).filter(Boolean);
      card.append(h('div', { class: 'shop-region-head' },
        regionMarker(r.id, 1),
        h('div', { class: 'grow' }, h('h3', {}, r.name), h('p', { class: 'muted small' }, r.desc, !unlocked && incl.length ? ` Inklusive ${incl.join(', ')}.` : '')),
        unlocked ? h('span', { class: 'owned' }, 'Freigeschaltet')
          : h('button', {
            class: 'btn primary small price',
            disabled: bal < price,
            'aria-label': `${r.name} für ${price} Tokens freischalten`,
            onclick: () => buy('region', r.id, r.name, price),
          }, icon('coin', 12), String(price))));

      const grid = h('div', { class: 'shop-grid' });
      for (const p of plantsOfRegion(r.id)) {
        const have = store.unlocked().species.has(p.id);
        const can = unlocked && !have && bal >= p.price;
        grid.append(h('div', { class: 'shop-item' + (have ? ' have' : '') },
          spriteEl(p.id, 5, p.variants[0] || null, 2),
          h('div', { class: 'shop-name' }, p.name),
          !hasRealSprites(p.id) ? h('div', { class: 'wip' }, 'Skizze') : null,
          have ? h('div', { class: 'owned small' }, unlocked ? 'Frei' : 'Gekauft')
            : h('button', {
              class: 'btn small price ' + (can ? 'primary' : 'secondary'),
              'aria-label': `${p.name} für ${p.price} Tokens freischalten`,
              disabled: !can,
              title: !unlocked ? 'Erst die Region freischalten' : bal < p.price ? 'Nicht genug Tokens' : '',
              onclick: () => buy('plant', p.id, p.name, p.price),
            }, unlocked ? null : icon('lock', 12), icon('coin', 12), String(p.price))));
      }
      card.append(grid);
      page.append(card);
    }
    root.append(page);
  }

  async function buy(type, id, name, price) {
    const ok = await confirmDialog({
      title: `${name} freischalten?`,
      text: `Kostet ${plural(price, 'Token')}. Danach hast du noch ${plural(store.balance() - price, 'Token')}.`,
      ok: 'Freischalten',
    });
    if (!ok) return;
    try {
      await store.buy(type, id);
      // Mehrere Käufe hintereinander: ein Toast, der alles zusammenfasst
      if (!recent.includes(name)) recent.push(name);
      const shownNames = recent.length > 3 ? [...recent.slice(0, 2), plural(recent.length - 2, 'weitere', 'weitere')] : recent;
      toast(`${joinNames(shownNames)} freigeschaltet!`, 2600, { id: 'shop', onDone: () => { recent = []; } });
    } catch (e) {
      toast(e.message, 2600, { id: 'shop' });
    }
  }
  let recent = [];

  render();
  const off = store.onChange(render);
  return { unmount: off };
}

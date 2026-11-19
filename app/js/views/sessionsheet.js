// Session-Details, Tag nachträglich ändern (ab 0.5.4) und Löschen. Genutzt von Statistik und Orte.
import { h, openSheet, confirmDialog, spriteEl, toast } from '../ui.js';
import * as store from '../store.js';
import { fmtDuration, fmtDate, fmtTime } from '../format.js';
import { PLANT_BY_ID } from '../plants.js';
import { plural } from '../text.js';

/** Hinweistext zu den Pflanzen, die mit der Session den Tag wechseln. */
export function retagNote(nPlants) {
  if (nPlants === 0) return '';
  if (nPlants === 1) return 'Die dabei gewachsene Pflanze wechselt mit.';
  return `Alle ${nPlants} Pflanzen dieser Session wechseln mit.`;
}

function sessionPlants(s) {
  const ids = new Set(s.plantIds || []);
  return store.S.plants.filter((p) => p.sessionId === s.id || ids.has(p.id));
}

/** Sheet zur Tag-Auswahl. → Promise<boolean> (true = geändert) */
export function openRetagSheet(sessionId) {
  return new Promise((resolve) => {
    const s = store.S.sessions.find((x) => x.id === sessionId);
    if (!s) return resolve(false);
    const nPl = sessionPlants(s).length;
    let pick = s.tagId;
    let changed = false;
    openSheet((close) => {
      const tags = store.activeTags();
      const chips = h('div', { class: 'chips retag-chips', role: 'radiogroup', 'aria-label': 'Tag wählen' });
      const save = h('button', { class: 'btn primary', disabled: true }, 'Speichern');
      const paint = () => {
        for (const b of chips.querySelectorAll('.chip')) {
          const on = b.dataset.id === pick;
          b.classList.toggle('on', on);
          b.setAttribute('aria-checked', String(on));
        }
        save.disabled = !pick || pick === s.tagId;
      };
      for (const t of tags) {
        chips.append(h('button', {
          class: 'chip', 'data-id': t.id, role: 'radio', style: { '--tag': t.color },
          onclick: () => { pick = t.id; paint(); },
        }, h('span', { class: 'dot' }), h('span', { class: 'chip-label tname' }, t.name)));
      }
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          const r = await store.retagSession(s.id, pick);
          changed = r.changed;
          close();
          if (r.changed) toast('Tag geändert');
        } catch (e) {
          toast(e.message || 'Konnte den Tag nicht ändern');
          paint();
        }
      });
      paint();
      const cur = store.tagById(s.tagId);
      return h('div', { class: 'dialog retag' },
        h('h2', {}, 'Tag ändern'),
        h('p', { class: 'muted' },
          `${fmtDuration(s.minutes * 60000)} vom ${fmtDate(s.startedAt)}. Aktuell: `,
          h('strong', { class: 'tname' }, store.tagName(s.tagId)),
          cur?.deleted ? '. Wähle einen vorhandenen Tag.' : '.'),
        tags.length ? chips : h('p', { class: 'muted' }, 'Es gibt keinen vorhandenen Tag. Lege unter „Mehr“ einen an.'),
        nPl ? h('p', { class: 'muted small retag-note' }, retagNote(nPl)) : null,
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn secondary', onclick: () => close() }, 'Abbrechen'), save));
    }, { onClose: () => resolve(changed) });
  });
}

/** Löschen mit Bestätigung (wie bisher in der Statistik). */
export async function deleteSessionFlow(s) {
  const nPl = sessionPlants(s).length;
  const pv = store.deletePreview(s.id);
  const tok = s.tokens || 0;
  const tokText = tok === 0 ? ''
    : pv.alreadySpent === 0 ? ` Die ${plural(tok, 'Token')} werden abgezogen.`
      : pv.lost === 0 ? ` Die ${plural(tok, 'Token')} hast du schon ausgegeben – dein Kontostand bleibt bei 0, gekaufte Pflanzen behältst du.`
        : ` ${plural(pv.lost, 'Token')} werden abgezogen, der Rest ist schon ausgegeben – dein Kontostand fällt auf 0, gekaufte Pflanzen behältst du.`;
  const ok = await confirmDialog({
    title: 'Session löschen?',
    text: `${fmtDuration(s.minutes * 60000)} vom ${fmtDate(s.startedAt)}${nPl ? ` und ${nPl === 1 ? 'die dabei gewachsene Pflanze wird' : `die ${nPl} dabei gewachsenen Pflanzen werden`} entfernt.` : ' wird entfernt.'}${tokText}`,
    ok: 'Löschen', danger: true,
  });
  if (ok) { await store.deleteSession(s.id); toast('Session gelöscht'); }
  return ok;
}

/** Details-Sheet einer Session mit „Tag ändern“ und „Löschen“. */
export function openSessionSheet(sessionId) {
  const s = store.S.sessions.find((x) => x.id === sessionId);
  if (!s) return;
  const pls = sessionPlants(s);
  const p = pls[0];
  openSheet((close) => h('div', { class: 'dialog session-detail' },
    h('h2', {}, 'Session'),
    h('div', { class: 'sd-head' },
      p ? spriteEl(p.species, p.stage, p.variant, 2) : h('span', { class: 'sprite-empty big' }),
      h('div', { class: 'grow' },
        h('div', { class: 'session-tag' }, h('span', { class: 'dot', style: { background: store.tagColor(s.tagId) } }), h('span', { class: 'tname' }, store.tagName(s.tagId))),
        h('div', { class: 'muted small' }, `${fmtDate(s.startedAt)} · ${fmtTime(s.startedAt)}–${fmtTime(s.endedAt)}`),
        h('div', { class: 'muted small pname' }, `${fmtDuration(s.minutes * 60000)} · ${pls.length > 1 ? pls.length + '× ' : ''}${PLANT_BY_ID[s.species]?.label || ''}`))),
    h('div', { class: 'sd-actions' },
      h('button', { class: 'btn secondary', onclick: () => { close(); setTimeout(() => openRetagSheet(s.id), 190); } }, 'Tag ändern'),
      h('button', { class: 'btn ghost danger-text', onclick: () => { close(); setTimeout(() => deleteSessionFlow(s), 190); } }, 'Löschen')),
    h('div', { class: 'dialog-actions' }, h('button', { class: 'btn secondary', onclick: () => close() }, 'Schließen'))));
}

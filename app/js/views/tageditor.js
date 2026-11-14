import { h, openSheet, confirmDialog, toast } from '../ui.js';
import { CONFIG } from '../config.js';
import * as store from '../store.js';

/** Tag anlegen/bearbeiten. → Promise<tag|null> */
export function editTag(tag = null) {
  return new Promise((resolve) => {
    let color = tag?.color || CONFIG.tagColors[store.activeTags().length % CONFIG.tagColors.length];
    let result = null;
    openSheet((close) => {
      const input = h('input', { type: 'text', value: tag?.name || '', placeholder: 'z. B. Bachelorarbeit', maxlength: 40, autofocus: true, class: 'input' });
      const swatches = h('div', { class: 'swatches' });
      const custom = h('input', { type: 'color', value: color, class: 'swatch-custom', 'aria-label': 'Eigene Farbe' });
      const paint = () => {
        for (const b of swatches.querySelectorAll('button')) b.classList.toggle('on', b.dataset.c === color);
        custom.value = color;
      };
      for (const c of CONFIG.tagColors) {
        swatches.append(h('button', { class: 'swatch', 'data-c': c, style: { background: c }, 'aria-label': 'Farbe ' + c, onclick: () => { color = c; paint(); } }));
      }
      custom.addEventListener('input', () => { color = custom.value; paint(); });
      swatches.append(custom);
      paint();
      const err = h('p', { class: 'field-error', role: 'alert', 'aria-live': 'polite' });
      const showErr = (msg) => {
        err.textContent = msg || '';
        input.classList.toggle('invalid', !!msg);
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      };
      const check = () => {
        const name = input.value.trim();
        if (!name) return 'Bitte gib dem Tag einen Namen.';
        if (store.tagNameTaken(name, tag?.id)) return `Es gibt schon einen Tag „${name}“. Wähle einen anderen Namen.`;
        return '';
      };
      const save = async () => {
        const msg = check();
        if (msg) { showErr(msg); input.focus(); return; }
        try {
          result = await store.saveTag({ ...(tag || {}), name: input.value.trim(), color });
          close();
        } catch (e) {
          showErr(e.message);
        }
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      input.addEventListener('input', () => { if (err.textContent) showErr(check()); });
      return h('div', { class: 'dialog' },
        h('h2', {}, tag ? 'Tag bearbeiten' : 'Neuer Tag'),
        h('label', { class: 'field' }, h('span', {}, 'Name'), input, err),
        h('div', { class: 'field' }, h('span', {}, 'Farbe'), swatches),
        h('div', { class: 'dialog-actions' },
          tag ? h('button', {
            class: 'btn ghost danger-text',
            onclick: async () => {
              close();
              const ok = await confirmDialog({
                title: `„${tag.name}“ löschen?`,
                text: 'Bisherige Lernzeit bleibt in den Statistiken erhalten (als gelöschter Tag).',
                ok: 'Löschen', danger: true,
              });
              if (ok) {
                await store.deleteTag(tag.id);
                toast('Tag gelöscht');
              }
            },
          }, 'Löschen') : null,
          h('button', { class: 'btn secondary', onclick: () => close() }, 'Abbrechen'),
          h('button', { class: 'btn primary', onclick: save }, 'Speichern'),
        ));
    }, { onClose: () => setTimeout(() => resolve(result), 0) });
  });
}

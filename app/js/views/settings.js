// Einstellungen: Backup, Tags, Speicher, Licht-Vorschau.
import { h, clear, icon, confirmDialog, toast } from '../ui.js';
import * as store from '../store.js';
import { editTag } from './tageditor.js';
import { fmtDate, fmtTime } from '../format.js';
import { CONFIG } from '../config.js';
import { PLANTS } from '../plants.js';
import { hasRealSprites } from '../sprites.js';
import { setLightOverride, getLightOverride, currentLight } from '../clock.js';
import { APP_VERSION } from '../version.js';
import { importErrorMessage, backupStatus } from '../backup.js';
import { plural } from '../text.js';

export function mount(root) {
  let prepared = null; // vorbereitete Backup-Datei (Share muss synchron im Klick passieren)
  let persisted = null;
  let estimate = null;

  function prepare() {
    const data = store.exportData();
    const name = `wurzelwerk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    let file = null;
    try { file = new File([blob], name, { type: 'application/json' }); } catch { /* alte Browser */ }
    prepared = { blob, file, name };
  }

  async function exportBackup() {
    if (!prepared) prepare();
    const { file, blob, name } = prepared;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Wurzelwerk-Backup' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = h('a', { href: url, download: name });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      await store.setKV('lastBackupAt', Date.now());
      toast('Backup erstellt');
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Backup fehlgeschlagen. Bitte noch einmal versuchen.');
    }
  }

  async function importBackup(fileInput) {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    let obj, info;
    try {
      obj = JSON.parse(await f.text());
      info = store.validateBackup(obj);
    } catch (e) {
      toast(importErrorMessage(e), 4200);
      return;
    }
    const ok = await confirmDialog({
      title: 'Backup importieren?',
      text: `Backup ${info.exportedAt ? 'vom ' + fmtDate(info.exportedAt) : 'ohne Datum'}: ${plural(info.sessions, 'Session')}, ${plural(info.plants, 'Pflanze')}, ${plural(info.tags, 'Tag', 'Tags')}. Alle aktuellen Daten auf diesem Gerät werden dabei ersetzt. Eine laufende Session bleibt erhalten.`,
      ok: 'Ersetzen und importieren', danger: true,
    });
    if (!ok) return;
    try {
      await store.importData(obj);
      toast('Backup importiert');
    } catch (e) {
      toast('Import fehlgeschlagen: ' + importErrorMessage(e), 4200);
    }
  }

  function render() {
    prepare();
    clear(root);
    const now = Date.now();
    const page = h('div', { class: 'page settings' });
    page.append(h('header', { class: 'topbar' }, h('h1', {}, 'Einstellungen')));

    // Backup
    const last = store.S.kv.lastBackupAt;
    const { due: warn, days: age } = backupStatus(store.S.kv, store.S.sessions.length, now, CONFIG.backupReminderDays);
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: (e) => importBackup(e.target) });
    page.append(h('section', { class: 'card' },
      h('h3', {}, 'Backup'),
      h('p', { class: 'backup-age' + (warn ? ' warn' : '') }, warn ? icon('warn', 24) : null,
        h('span', {}, last ? (age === 0 ? 'Letztes Backup: heute' : age === 1 ? 'Letztes Backup: gestern' : `Letztes Backup vor ${age} Tagen`) : 'Noch kein Backup erstellt')),
      h('p', { class: 'muted small' }, 'Alle Daten liegen nur auf diesem Gerät. Sichere sie regelmäßig in Dateien/iCloud – z. B. vor einem iOS-Update.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', onclick: exportBackup }, icon('share', 14), 'Backup exportieren'),
        h('button', { class: 'btn secondary', onclick: () => fileInput.click() }, 'Importieren'),
      ),
      fileInput,
    ));

    // Tags
    const tagList = h('div', { class: 'tag-list' });
    for (const t of store.activeTags()) {
      const mins = store.S.sessions.filter((s) => s.tagId === t.id).reduce((a, s) => a + s.minutes, 0);
      tagList.append(h('button', { class: 'tag-item', onclick: () => editTag(t) },
        h('span', { class: 'dot big', style: { background: t.color } }),
        h('span', { class: 'grow tag-name' }, t.name),
        h('span', { class: 'muted small nowrap' }, mins ? (mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`) : ''),
        icon('edit', 14)));
    }
    page.append(h('section', { class: 'card' },
      h('h3', {}, 'Tags'),
      tagList,
      h('button', { class: 'btn secondary', onclick: () => editTag() }, icon('plus', 12), 'Tag hinzufügen'),
    ));

    // Licht-Vorschau
    const ov = getLightOverride();
    const val = ov ?? (new Date().getHours() * 60 + new Date().getMinutes());
    const out = h('span', { class: 'muted' });
    const setOut = (m) => { out.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} · ${currentLight().phase}`; };
    const slider = h('input', {
      type: 'range', min: 0, max: 1439, step: 5, value: val, class: 'range',
      oninput: (e) => {
        setLightOverride(+e.target.value);
        setOut(+e.target.value);
        window.dispatchEvent(new Event('wurzelwerk:light'));
        live.checked = false;
      },
    });
    const live = h('input', {
      type: 'checkbox', checked: ov == null,
      onchange: (e) => {
        if (e.target.checked) setLightOverride(null);
        else setLightOverride(+slider.value);
        setOut(+slider.value);
        window.dispatchEvent(new Event('wurzelwerk:light'));
      },
    });
    setOut(val);
    page.append(h('section', { class: 'card' },
      h('h3', {}, 'Tageszeit in den Orten'),
      h('p', { class: 'muted small' }, 'Das Licht folgt der echten Uhrzeit (Sonnenstand für Deutschland). Hier kannst du andere Tageszeiten ansehen – gilt nur bis zum Neustart.'),
      h('label', { class: 'check' }, live, h('span', {}, 'Echtzeit')),
      h('label', { class: 'range-wrap' }, h('span', { class: 'sr-only' }, 'Uhrzeit für die Vorschau'), slider), out,
    ));

    // Speicher & Info
    const drawn = PLANTS.filter((p) => hasRealSprites(p.id)).length;
    page.append(h('section', { class: 'card' },
      h('h3', {}, 'Speicher & Info'),
      h('div', { class: 'kv' },
        h('span', {}, 'Dauerhafter Speicher'), h('span', {}, persisted == null ? '…' : persisted ? 'aktiv' : 'nicht gewährt'),
        h('span', {}, 'Belegt'), h('span', {}, estimate ? `${(estimate.usage / 1024).toFixed(0)} KB` : '…'),
        h('span', {}, 'Gespeichert'), h('span', {}, `${plural(store.S.sessions.length, 'Session')} · ${plural(store.S.plants.length, 'Pflanze')}`),
        h('span', {}, 'Gezeichnete Arten'), h('span', {}, `${drawn} von ${PLANTS.length}`),
        h('span', {}, 'Version'), h('span', {}, APP_VERSION),
        h('span', {}, 'Installiert seit'), h('span', {}, store.S.kv.installedAt ? fmtDate(store.S.kv.installedAt) : '–'),
      ),
      persisted === false ? h('p', { class: 'muted small' }, 'Tipp: Über Safari → Teilen → „Zum Home-Bildschirm“ installieren. Dann löscht iOS die Daten nicht automatisch.') : null,
    ));
    page.append(h('p', { class: 'muted small center footer-note' }, `Wurzelwerk · lokal gespeichert · ${fmtTime(new Date())}`));
    root.append(page);
  }

  (async () => {
    try {
      persisted = await navigator.storage?.persisted?.() ?? false;
      estimate = await navigator.storage?.estimate?.();
    } catch { persisted = false; }
    render();
  })();

  render();
  const off = store.onChange(render);
  return { unmount: off };
}

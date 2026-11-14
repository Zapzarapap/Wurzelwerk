// Backup: Export-Format, Prüfung beim Import, Erinnerung – rein, ohne Browser (getestet in app/tests).

/** Diese Schlüssel wandern nie ins Backup und werden beim Import ignoriert. */
export const KV_LOCAL_ONLY = ['lastBackupAt', 'active'];

export function buildExport(S, now = new Date()) {
  return {
    app: 'wurzelwerk',
    format: 1,
    exportedAt: now.toISOString(),
    data: {
      tags: S.tags,
      sessions: S.sessions,
      plants: S.plants,
      kv: Object.entries(S.kv).filter(([k]) => !KV_LOCAL_ONLY.includes(k)).map(([key, value]) => ({ key, value })),
    },
  };
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const isId = (x) => (typeof x === 'string' && x.length > 0) || (typeof x === 'number' && Number.isFinite(x));

function fail(msg) {
  const e = new Error(msg);
  e.userMessage = true;
  throw e;
}

/** Prüft ein Backup gründlich; Fehlermeldungen sind deutsch und verständlich. */
export function validateBackup(obj) {
  if (!isObj(obj) || obj.app !== 'wurzelwerk' || !isObj(obj.data)) fail('Das ist keine Wurzelwerk-Backup-Datei.');
  if (obj.format != null && obj.format > 1) fail('Dieses Backup stammt aus einer neueren App-Version. Bitte Wurzelwerk zuerst aktualisieren.');
  const d = obj.data;
  const names = { tags: 'Tags', sessions: 'Sessions', plants: 'Pflanzen', kv: 'Einstellungen' };
  for (const k of Object.keys(names)) if (!Array.isArray(d[k])) fail(`Das Backup ist unvollständig: Die ${names[k]} fehlen.`);
  const unique = (list, key, label) => {
    const seen = new Set();
    list.forEach((x, i) => {
      if (!isObj(x) || !isId(x[key])) fail(`Das Backup ist beschädigt: Eintrag ${i + 1} der ${label} hat keine gültige Kennung.`);
      if (seen.has(x[key])) fail(`Das Backup ist beschädigt: Die ${label} enthalten einen Eintrag doppelt.`);
      seen.add(x[key]);
    });
  };
  unique(d.tags, 'id', 'Tags');
  unique(d.sessions, 'id', 'Sessions');
  unique(d.plants, 'id', 'Pflanzen');
  unique(d.kv, 'key', 'Einstellungen');
  d.sessions.forEach((s, i) => {
    const ok = Array.isArray(s.segments) && s.segments.every((g) => Array.isArray(g) && g.length === 2 && g.every((t) => Number.isFinite(t)) && g[1] >= g[0]);
    if (!ok) fail(`Das Backup ist beschädigt: Session ${i + 1} hat ungültige Zeiten.`);
  });
  d.tags.forEach((t, i) => {
    if (typeof t.name !== 'string') fail(`Das Backup ist beschädigt: Tag ${i + 1} hat keinen Namen.`);
  });
  return {
    tags: d.tags.filter((t) => !t.deleted).length,
    sessions: d.sessions.length,
    plants: d.plants.length,
    exportedAt: obj.exportedAt,
  };
}

/** kv-Einträge, die importiert werden (ohne laufende Session und Backup-Datum). */
export function importableKV(kv) {
  return kv.filter((r) => !KV_LOCAL_ONLY.includes(r.key));
}

/** Technische Fehler (IndexedDB, Quota …) in eine verständliche Meldung übersetzen. */
export function importErrorMessage(e) {
  if (e?.userMessage) return e.message;
  if (e instanceof SyntaxError) return 'Die Datei ist kein gültiges Backup (kein lesbares JSON).';
  const n = e?.name || '';
  if (n === 'QuotaExceededError') return 'Auf dem Gerät ist nicht genug Speicherplatz frei.';
  if (n === 'DataError' || n === 'DataCloneError' || n === 'ConstraintError') return 'Das Backup enthält Daten, die nicht gespeichert werden können. Es ist vermutlich beschädigt.';
  return 'Die Daten konnten nicht gespeichert werden. Bitte noch einmal versuchen – deine bisherigen Daten sind unverändert.';
}

/** Soll an ein Backup erinnert werden? → { due, days (null = noch nie) } */
export function backupStatus(kv, sessionCount, now = Date.now(), reminderDays = 7) {
  const last = kv.lastBackupAt;
  const days = last ? Math.floor((now - last) / 86400000) : null;
  const due = sessionCount > 0 && (days == null || days >= reminderDays);
  return { due, days };
}

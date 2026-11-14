// Laufende Session als reine Daten. Zeit wird nie hochgezählt, sondern aus
// Zeitstempeln berechnet – übersteht App-Schließen und Sperren.
//
// active = {
//   tagId, region, species, variant, mode: 'timer'|'endless', targetMin,
//   segments: [[start, end], ...],   // abgeschlossene aktive Abschnitte (ms)
//   openStart: number|null,          // Beginn des laufenden Abschnitts, null = pausiert
//   createdAt
// }

export function createActive({ tagId, region, species, variant, mode, targetMin }, now) {
  return {
    tagId, region, species, variant: variant ?? null,
    mode, targetMin: mode === 'timer' ? targetMin : null,
    segments: [],
    openStart: now,
    createdAt: now,
  };
}

export function closedMs(active) {
  return active.segments.reduce((a, [s, e]) => a + (e - s), 0);
}

export function elapsedMs(active, now) {
  return closedMs(active) + (active.openStart != null ? Math.max(0, now - active.openStart) : 0);
}

export function isPaused(active) {
  return active.openStart == null;
}

export function pause(active, now) {
  if (active.openStart == null) return active;
  return { ...active, segments: [...active.segments, [active.openStart, Math.max(active.openStart, now)]], openStart: null };
}

export function resume(active, now) {
  if (active.openStart != null) return active;
  return { ...active, openStart: now };
}

/** Zeitpunkt, an dem ein Timer abgelaufen ist/sein wird (nur wenn er läuft). */
export function timerEndAt(active) {
  if (active.mode !== 'timer' || active.openStart == null) return null;
  const rest = active.targetMin * 60000 - closedMs(active);
  return active.openStart + Math.max(0, rest);
}

/** Ist der Timer zum Zeitpunkt now abgelaufen? */
export function timerDone(active, now) {
  if (active.mode !== 'timer') return false;
  return elapsedMs(active, now) >= active.targetMin * 60000;
}

/**
 * Beendet die Session. Timer werden exakt am Ablaufzeitpunkt abgeschnitten,
 * auch wenn die App erst später geöffnet wird.
 * → { segments, endedAt, ms, minutes }
 */
export function finalize(active, now) {
  let end = now;
  if (active.mode === 'timer') {
    const t = timerEndAt(active);
    if (t != null && t < now) end = t;
  }
  let segments = active.segments.map((s) => [...s]);
  if (active.openStart != null) segments.push([active.openStart, Math.max(active.openStart, end)]);
  if (active.mode === 'timer') {
    // Sicherheitsnetz: nie mehr als die Zieldauer
    let budget = active.targetMin * 60000;
    segments = segments.map(([s, e]) => {
      const d = Math.min(e - s, Math.max(0, budget));
      budget -= d;
      return [s, s + d];
    });
  }
  segments = segments.filter(([s, e]) => e > s);
  const ms = segments.reduce((a, [s, e]) => a + (e - s), 0);
  const endedAt = segments.length ? segments[segments.length - 1][1] : (active.openStart ?? now);
  return { segments, endedAt, ms, minutes: Math.floor(ms / 60000) };
}

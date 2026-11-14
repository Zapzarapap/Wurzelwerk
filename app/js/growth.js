// Wachstumslogik – rein, ohne Browser-Abhängigkeiten (getestet in app/tests).
import { CONFIG } from './config.js';

/** Stufe (0–5) für eine Lernzeit in Minuten. < 15 min → 0 (nichts). */
export function stageFor(minutes, steps = CONFIG.growthSteps) {
  let stage = 0;
  for (const s of steps) if (minutes >= s.minutes) stage = s.stage;
  return stage;
}

/**
 * Teilt eine Gesamtzeit auf Pflanzen auf: je volle 120 min eine Pflanze,
 * der Rest beginnt eine weitere. 250 → [120, 120, 10].
 */
export function splitMinutes(total, full = CONFIG.minutesPerFullPlant) {
  total = Math.max(0, Math.floor(total));
  const parts = [];
  while (total >= full) {
    parts.push(full);
    total -= full;
  }
  if (total > 0) parts.push(total);
  return parts;
}

/**
 * Pflanzen, die eine Session hinterlässt: [{minutes, stage}] – nur Stufe ≥ 1.
 * Gilt für Endless und (konsistent) für Timer > 120 min.
 */
export function plantsForMinutes(total) {
  return splitMinutes(total)
    .map((minutes) => ({ minutes, stage: stageFor(minutes) }))
    .filter((p) => p.stage > 0);
}

/**
 * Fortschritt der gerade wachsenden Pflanze.
 * → { index (0-basiert), minutes (dieser Pflanze), stage, nextStage, minutesToNext, progress 0..1 }
 */
export function growingInfo(total, steps = CONFIG.growthSteps, full = CONFIG.minutesPerFullPlant) {
  total = Math.max(0, total);
  const index = Math.floor(total / full);
  const minutes = total - index * full;
  const stage = stageFor(minutes, steps);
  const next = steps.find((s) => s.minutes > minutes);
  const prevMin = steps.filter((s) => s.minutes <= minutes).pop()?.minutes ?? 0;
  return {
    index,
    minutes,
    stage,
    nextStage: next ? next.stage : null,
    minutesToNext: next ? next.minutes - minutes : 0,
    progress: next ? (minutes - prevMin) / (next.minutes - prevMin) : 1,
    finished: index, // Anzahl bereits ausgewachsener Pflanzen
  };
}

export function tokensFor(minutes) {
  return Math.floor(Math.max(0, minutes) * CONFIG.tokensPerMinute);
}

/**
 * Kontostand: nie negativ. adjust gleicht Tokens aus, die durch das Löschen
 * einer Session schon ausgegeben waren (gekaufte Pflanzen bleiben).
 */
export function tokenBalance(earned, spent, adjust = 0) {
  return Math.max(0, earned + adjust - spent);
}

/**
 * Was passiert beim Löschen einer Session mit `tokens` Tokens?
 * → { lost: Tokens, die vom Kontostand abgehen, alreadySpent: Teil, der schon ausgegeben ist,
 *     adjust: neuer Ausgleichswert }
 */
export function tokensAfterDelete(earned, spent, adjust, tokens) {
  const before = earned + adjust - spent; // kann durch alte Daten < 0 sein
  const avail = Math.max(0, before);
  const lost = Math.min(avail, tokens);
  const after = before - tokens;
  return { lost, alreadySpent: tokens - lost, adjust: after < 0 ? adjust - after : adjust };
}

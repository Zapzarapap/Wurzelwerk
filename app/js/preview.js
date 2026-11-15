// Shop-Vorschau (v0.5.3): reine Logik ohne DOM – Stufen mit Minuten, Lernzeit für einen
// Preis, Zustand des Kauf-Buttons, Farbfelder der Varianten. Getestet in app/tests.
import { CONFIG } from './config.js';
import { RAMPS, VARIANT_RAMP } from './palette.js';
import { fmtDuration } from './format.js';
import { plural } from './text.js';

/** Die 5 Wachstumsstufen mit der Lernzeit, ab der sie erreicht sind: [{stage, minutes}]. */
export function stageMinutes() {
  return CONFIG.growthSteps.map(({ stage, minutes }) => ({ stage, minutes }));
}

/** Wie viele Lernminuten so viele Tokens bringen (aufgerundet). */
export function studyMinutes(tokens) {
  return Math.ceil(Math.max(0, tokens) / CONFIG.tokensPerMinute);
}

/** „≈ 4 h 10 min“ – Lernzeit, die einem Tokenbetrag entspricht. */
export function studyText(tokens) {
  return fmtDuration(studyMinutes(tokens) * 60000);
}

/**
 * Zustand des Kauf-Buttons in der Vorschau.
 * → { kind: 'owned' | 'region' | 'tokens' | 'buy', label, hint, enabled }
 */
export const REGION_IN = {
  pflanzenhandlung: 'in der Pflanzenhandlung', gewaechshaus: 'im Gewächshaus', blumenwiese: 'auf der Blumenwiese', wald: 'im Wald',
};

export function buyState({ price, have, regionUnlocked, region, regionName, regionPrice, balance }) {
  const where = REGION_IN[region] || `in ${regionName}`;
  if (have && regionUnlocked) return { kind: 'owned', label: 'Freigeschaltet', hint: '', enabled: false };
  if (!regionUnlocked) {
    return {
      kind: 'region',
      label: `Erst ${regionName} freischalten`,
      hint: have
        ? `Wächst ${where}. Sobald der Ort freigeschaltet ist (${plural(regionPrice, 'Token')}), kannst du sie pflanzen.`
        : `Diese Pflanze wächst ${where}. Schalte zuerst den Ort frei (${plural(regionPrice, 'Token')}), dann kannst du sie kaufen.`,
      enabled: false,
    };
  }
  if (balance < price) {
    const missing = price - balance;
    return {
      kind: 'tokens',
      label: `Freischalten · ${price.toLocaleString('de-DE')}`,
      hint: `Dir fehlen noch ${plural(missing, 'Token')} – etwa ${studyText(missing)} Lernzeit.`,
      enabled: false,
    };
  }
  return {
    kind: 'buy',
    label: `Freischalten · ${price.toLocaleString('de-DE')}`,
    hint: `Danach hast du noch ${plural(balance - price, 'Token')}.`,
    enabled: true,
  };
}

// Farbfeld je Variante: Grundton der Rampe, die tools/sprites für die Variante nutzt.
const EXTRA_RAMP = { gruen: 'leaf', hellblau: 'bw_skyblue', beige: 'gh_pumpkin_beige', rotbraun: 'bw_russet' };
export function variantSwatch(v) {
  const ramp = RAMPS[EXTRA_RAMP[v] || VARIANT_RAMP[v]];
  return ramp ? ramp[2] : '#9a8a78';
}

/**
 * Ganzzahliger Maßstab für den Stufen-Streifen: 5 Sprites à 32 px nebeneinander in `inner` px
 * (Innenbreite des Sheets). 2× ab 320 px + Rahmen + Trennlinien, sonst 1× – nie gestaucht.
 */
export function stripScale(inner) {
  return inner - 4 - 4 >= 5 * 64 ? 2 : 1; // 2 px Rahmen je Seite, 4 × 1 px Trennlinie
}

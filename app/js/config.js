// Zentrale Konfiguration – alle Zahlen sind Platzhalter und können hier justiert werden.

export const CONFIG = {
  // --- Tokens -------------------------------------------------------------
  tokensPerMinute: 1, // 1 Token pro Lernminute

  // --- Wachstum (Minuten → Stufe), siehe docs/KONZEPT.md -----------------
  growthSteps: [
    { minutes: 15, stage: 1 },
    { minutes: 30, stage: 2 },
    { minutes: 60, stage: 3 },
    { minutes: 90, stage: 4 },
    { minutes: 120, stage: 5 },
  ],
  // Nach so vielen Minuten ist eine Pflanze fertig, danach beginnt die nächste
  minutesPerFullPlant: 120,

  // --- Freischaltung -------------------------------------------------------
  startUnlocked: {
    regions: ['pflanzenhandlung'],
    species: ['monstera', 'kaktus'],
  },
  regionPrices: {
    pflanzenhandlung: 0,
    gewaechshaus: 600,
    blumenwiese: 600,
    wald: 600,
  },
  // Beim Kauf einer Region gratis mit freigeschaltet (Platzhalter)
  includedWithRegion: {
    gewaechshaus: ['basilikum'],
    blumenwiese: ['mohn'],
    wald: ['fliegenpilz'],
  },
  plantPrices: {
    // Pflanzenhandlung
    monstera: 0,
    kaktus: 0,
    sukkulente: 120,
    calathea_lancifolia: 180,
    calathea_orbifolia: 200,
    alocasia_mask: 250,
    alocasia_dragon_scale: 300,
    alocasia_black_velvet: 350,
    alocasia_jewel: 400,
    // Gewächshaus
    basilikum: 120,
    chili: 150,
    tomate: 180,
    gurke: 180,
    kuerbis: 250,
    melone: 300,
    // Blumenwiese
    gaensebluemchen: 120,
    mohn: 150,
    kornblume: 150,
    lavendel: 180,
    edelnelke: 200,
    germini: 220,
    lilie: 250,
    sonnenblume: 250,
    rose: 300,
    // Wald
    farn: 120,
    efeu: 140,
    heidelbeere: 180,
    pfifferling: 200,
    butterpilz: 200,
    steinpilz: 250,
    fliegenpilz: 300,
    gluehmoos: 400,
  },

  // --- Sessions ------------------------------------------------------------
  timerPresets: [15, 30, 45, 60, 90, 120],
  defaultTimerMinutes: 60,
  maxTimerMinutes: 600,

  // --- Backup --------------------------------------------------------------
  backupReminderDays: 7,

  // --- Tageszeit-Licht -----------------------------------------------------
  // Mitte Deutschlands, keine Standortabfrage
  location: { lat: 51.0, lon: 10.0 },

  // --- Garten --------------------------------------------------------------
  garden: {
    minDist: 18, // Mindestabstand der Pflanzen (Welt-Pixel)
    areaPerPlant: 820, // Welt-Pixel² pro Pflanze, bestimmt das Flächenwachstum
    baseWidth: 128, // kleinste Gartenbreite (Welt-Pixel)
    widthStep: 32, // Wachstumsschritt der Breite
    aspect: 1.3, // Höhe / Breite
    candidates: 14, // Kandidaten pro Pflanze (Best-Candidate-Poisson)
  },

  // Vorgeschlagene Tag-Farben (aus tools/sprites/palette.py)
  tagColors: [
    '#468a48', '#b4603e', '#4c70d0', '#8060bc', '#e4b832',
    '#dc7a98', '#c63e36', '#e47c2c', '#86583a', '#4a7a3e',
  ],
};

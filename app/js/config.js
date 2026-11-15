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
    gewaechshaus: 300,
    blumenwiese: 300,
    wald: 300,
  },
  // Beim Kauf einer Region gratis mit freigeschaltet (Platzhalter)
  includedWithRegion: {
    gewaechshaus: ['basilikum'],
    blumenwiese: ['mohn'],
    wald: ['fliegenpilz'],
  },
  // Faustregel: keine Pflanze kostet mehr als 5 h Lernzeit (300 Tokens),
  // die günstigsten gibt es nach 1,5 h. Regionen inkl. 1 Gratis-Pflanze: 5 h.
  plantPrices: {
    // Pflanzenhandlung
    monstera: 0,
    kaktus: 0,
    sukkulente: 90,
    calathea_lancifolia: 150,
    calathea_orbifolia: 150,
    alocasia_mask: 210,
    alocasia_dragon_scale: 240,
    alocasia_black_velvet: 270,
    alocasia_jewel: 300,
    pilea: 120,
    venusfliegenfalle: 180,
    orchidee: 210,
    strelitzie: 240,
    bonsai: 300,
    bogenhanf: 90,
    efeutute: 120,
    gummibaum: 180,
    anthurie: 210,
    philodendron_pink: 270,
    // Gewächshaus
    basilikum: 120,
    chili: 120,
    tomate: 150,
    gurke: 150,
    kuerbis: 210,
    melone: 240,
    erdbeere: 120,
    zucchini: 150,
    paprika: 180,
    aubergine: 180,
    mais: 210,
    radieschen: 90,
    salat: 90,
    karotte: 120,
    erbsen: 150,
    rosmarin: 150,
    // Blumenwiese
    gaensebluemchen: 90,
    mohn: 120,
    kornblume: 120,
    lavendel: 150,
    edelnelke: 150,
    germini: 180,
    lilie: 210,
    sonnenblume: 210,
    rose: 270,
    vergissmeinnicht: 90,
    pusteblume: 120,
    tulpe: 150,
    fingerhut: 180,
    mohnfeld: 240,
    ringelblume: 120,
    glockenblume: 150,
    wicke: 180,
    iris: 210,
    dahlie: 240,
    // Wald
    farn: 90,
    efeu: 120,
    heidelbeere: 150,
    pfifferling: 180,
    butterpilz: 180,
    steinpilz: 240,
    fliegenpilz: 240,
    gluehmoos: 300,
    walderdbeere: 120,
    baerlauch: 120,
    maigloeckchen: 150,
    zunderschwamm: 210,
    hexenring: 300,
    waldmeister: 90,
    buschwindroeschen: 120,
    preiselbeere: 150,
    tannensetzling: 180,
    parasol: 210,
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

# Szenen-System der Orte (ab v0.5)

Jede Region ist **eine Datei**: `app/js/scenes/<region>.js` (`pflanzenhandlung`, `gewaechshaus`,
`blumenwiese`, `wald`). Sie legt fest, wo Pflanzen stehen können, wie die Region wächst, welche
Deko und Möbel es gibt und wie der Hintergrund aussieht. Alles Gemeinsame liegt in
`app/js/scenekit/` und wird von den Regionen nur **benutzt, nicht geändert**.

Referenz: `scenes/pflanzenhandlung.js` (komplett im neuen Stil). Die anderen drei sind
migrierte v0.4-Stände und dürfen frei umgebaut werden.

## Dateien

| Datei | Inhalt | ändern? |
|---|---|---|
| `scenes/<region>.js` | Regionsmodul (API unten) | **ja, nur die eigene** |
| `scenes/index.js` | Register der vier Module | nein |
| `scenekit/engine.js` | Spot-Vergabe, Wachstum, Auffüllen, Deko-Regeln, Hitbox (rein, getestet) | nein |
| `scenekit/draw.js` | `Buf` (Pixelpuffer), `C` (Rampen als RGB), `PixelArt`, `slab/post/trap/text`, `sprite()`-Cache, `fin()` | nein |
| `scenekit/props.js` | gemeinsame Requisiten: `prop(name, v)` (Bücher, Gießkanne, Sack, Kiste, Kerze, Tasse, Katze …) | nein (nur gemeinsam) |
| `scenekit/light.js` | Himmel, Grading, Innenraumlicht, Lichthöfe, Strahlen | nein |
| `scenekit/rng.js` | `rng(key)`, `rngFor(id)`, `noise(x,y,seed)`, `pick`, `weighted`, `int` | nein |
| `garden.js` | generischer Renderer (Ebenen, feste Kamera „ganzer Ort“, Tippen; Pan/Zoom nur mit `CONFIG.garden.ortZoomEnabled`) | nein |
| `palette.js` | Rampen (Spiegel von `tools/sprites/palette.py`) | nein – eigene Rampen lokal definieren (s. u.) |

Eigene Pixel-Assets (PNG), falls nötig: `app/scenes-assets/<region>/` oder `art/scenes/<region>/`
(und in `sw.js` eintragen). Neue JS-Dateien ebenfalls in `sw.js` (`SHELL`) eintragen – ein Test prüft das.

## Regionsmodul – API

```js
export default {
  id: 'wald',
  nofoot: false,        // true: *_nofoot-Sprites laden, wo vorhanden (Gewächshaus). Pro Spot überschreibbar (spot.nofoot)
  anchor: 'center',     // wohin der Inhalt in einer größeren Füllfläche rückt: 'top' | 'center' | 'bottom'
  pad: { top, right, bottom, left }, // Rand um die Abschnitte (Platz für Kronen, Dach, Zaun …)
  minSections: 1,       // so viele Abschnitte sind immer da (auch ohne Pflanzen)
  fillSections: true,   // leere Abschnitte zum Auffüllen des Bildschirms erlaubt (Standard true)
  maxFill: 40,

  section(i) { ... },   // REIN: Abschnitt i (s. u.)
  pieces(scene) { ... },// REIN: Möbel + Deko (z-sortiert mit den Pflanzen)
  front(scene) { ... }, // optional, REIN: Vordergrund (über allem, z. B. Gräser, Blätter, Efeu)
  sprite(piece) { ... },// Browser: Sprite eines eigenen Teils → { img, glow, ax, ay, halo? } (gecacht)
  paint(scene) { ... }, // Browser: Hintergrund (s. u.)
};
```

### Abschnitte („Kapitel“) und Wachstum

`section(i)` → `{ rect: {x, y, w, h}, spots: [...], ...eigeneDaten }`

- `rect` in **Inhaltskoordinaten** (dürfen negativ sein; z. B. wächst das Haus der Pflanzenhandlung
  nach oben: `y = -(r+1)·RH`). Abschnitte überlappen sich nicht (Test).
- **Darf nur von `i` abhängen.** Kein Zugriff auf Pflanzen, Weltgröße oder Zufall ohne Seed.
  Zufall immer per `rng(\`<region>:...:${i}\`)`.
- Die Engine hängt Abschnitt i+1 erst an, wenn alle Spots von 0..i belegt sind.
  Dadurch: **Pflanzen ziehen nie um** (Test über 1 → 420 Pflanzen).
- Raster-Helfer: `gridSequence(n, {cw, ch, aspect, start:[C,R]})` liefert eine stabile
  Zellen-Reihenfolge, die ungefähr das Seitenverhältnis `aspect` (H/W) hält.
  Muss aber kein Raster sein – Lichtungen, Beete, Bachabschnitte … dürfen beliebig liegen,
  solange `section(i)` rein ist und sich nichts überlappt.
- Streu-Helfer: `scatter(w, h, rnd, {n, tries, margin, avoid})` – Best-Candidate-Streuung,
  Tipp-Flächen überlappen nicht und liegen im Rechteck.

### Spots (Stellplätze)

```js
{ x, y,          // Fußpunkt LOKAL im Abschnitt (Topfboden bzw. Erdpunkt, Sprite-Zeile 31 bzw. 27 bei nofoot)
  z,             // optional, lokal; Standard = y. Engine addiert rect.y. Bestimmt die Zeichenreihenfolge.
  kind,          // frei: 'shelf','sill','hang','floor','bench','bed','path','clearing','root','bank' …
  ground,        // optional: Untergrund ('wood','soil','grass','moss','gravel' …) – für eigene Effekte
  w,             // optional: Gewicht bei der Zufallswahl (Standard 1)
  jitter,        // optional: ± px Zufallsversatz
  nofoot,        // optional: Sprite ohne eigenen Fuß (überschreibt region.nofoot)
  hit,           // optional: Tipp-Fläche {dx, up, down} (Standard HIT = {dx: 8, up: 20, down: 1})
  noFlip, shadow // optional: nie spiegeln / keinen Bodenschatten zeichnen
}
```

Die Engine ergänzt `key` (`"<abschnitt>.<n>"`, stabil), `section`, Welt-`x/y/z` und `plant`.

**Regeln (werden getestet):**
1. Spot liegt in seinem Abschnitt.
2. **Tippen:** Der Punkt `(x, y-2)` jedes Spots muss beim Tippen *genau diese* Pflanze treffen,
   auch wenn alle Spots belegt sind (vorderste = größtes z gewinnt). Faustregel: Spots, deren
   Tipp-Flächen sich überlappen könnten, brauchen `|dx| > 16` oder `|dy| > 21`.
   Ab v0.5.2 trifft man im Browser zuerst über die **Sprite-Silhouette** (Alpha-Maske je
   Art/Stufe/Variante aus `sprites.js`, `engine.spriteDist`): ein sichtbares Pixel wählt die
   dort vorderste Pflanze, knapp daneben (Fingertoleranz ≈ 6 CSS-px) die nächste. Die
   Fuß-Tipp-Fläche (`hit`/`HIT`) bleibt der Rückfall (und gilt in den Tests ohne Sprites).
3. Fußpunkte mindestens 10 px auseinander.
4. Sprites dürfen sich gern überlappen (Blätter vor Blättern = Gruppe) – die Tipp-Regel reicht.

Höhen/Ebenen: Pflanzen stehen auf **verschiedenen Höhen** (Regalböden, Fensterbank, Stufen,
Baumstumpf, Beetrand). Für Regale: z gestaffelt so, dass das Brett *über* einer Ebene vor deren
Pflanzen liegt, aber hinter den Pflanzen, die darauf stehen (siehe `SPOTS.laden` + `board`).

### Szene (Eingabe für pieces/front/paint)

`buildScene(region, plants, fill)` liefert:

```js
scene = { region, W, H, ox, oy,          // Weltgröße; Inhalt → Welt: +ox/+oy
  sections: [{ index, rect (Welt), spots, fill, ...eigeneDaten }],
  spots, free,                            // alle bzw. freie Spots (Welt)
  items: [{ plant, spot, x, y, z, flip }],// Pflanzen, z-sortiert
  content: { x0, y0, x1, y1 },            // Inhaltsrechteck inkl. pad (Welt)
  capacity, base: {W, H} }
```

`ox/oy` ändern sich beim Auffüllen. Alles, was beim Wachsen/Auffüllen stabil bleiben soll
(z. B. Kachel-Deko, Kulisse), in **Inhaltskoordinaten** würfeln: `xInhalt = xWelt - ox`.

### Teile (pieces / front)

```js
{ x, y, z,           // Welt; (x, y) = Anker des Sprites (meist Fußpunkt Mitte)
  kind, v,           // eigenes Teil → region.sprite(piece)
  prop, v,           // ODER gemeinsames Requisit aus props.js (dann kein kind)
  flip,              // horizontal gespiegelt um den Anker
  spot: key,         // Deko auf einem Spot: verschwindet automatisch, sobald dort eine Pflanze steht
  yield: true, box,  // Deko weicht: fällt weg, wenn box {x0,y0,x1,y1} eine Pflanze berührt (propBox() hilft)
}
```

- Mit Pflanzen gemeinsam nach `z` sortiert (bei Gleichstand Teile zuerst).
- Möbel, vor denen/auf denen Pflanzen stehen, sind Teile (Theke, Tisch, Leiter, Baumstumpf);
  alles, was immer *hinter* allen Pflanzen liegt (Wand, Boden, Teppich, Weg), gehört in `paint()`.
- **Deko füllt Leere, verdeckt nie Pflanzen:** auf freien Spots `spot:` setzen; frei stehende
  Deko vor Pflanzen mit `yield` + `box`. Test: keine Deko auf belegten Spots / über Pflanzen,
  ohne Pflanzen mindestens 8 Teile.
- `sprite(p)`: über `sprite(key, build)` aus `draw.js` cachen; `build` gibt `fin(art, ax, ay, {halo})` zurück.

### Hintergrund: `paint(scene)` (Browser)

```js
return {
  canvas, glow,        // aus Buf.finish(): Hintergrund + Leucht-Maske
  sky: true,           // optional: Himmel hinter allem; scheint durch durchsichtige Pixel (Fenster, Glasdach)
  skySeed,             // Sterne/Wolken-Anordnung
  indoor: [{x,y,w,h}], // optional: Innenraum-Zonen, nachts warm (Lampenlicht) statt blau gegradet
  indoorWarm: [r,g,b], // optional: Farbe des Innenlichts bei voller Nacht (Standard [214,170,132])
  halos: [{x, y, r, rgb, a}],               // Lichthöfe (nachts, additiv)
  beams: [{pts:[[x,y]...], rgb, a, when}],  // Lichtstrahlen: when 'day' (Sonne durchs Fenster) | 'night' (Mondlicht)
  fx: { fireflies: [{x,y,p}], critters: [{x,y,p,bee,rgb,rgb2}] }, // animiert (sparsam, ≤ 12 fps)
  outside: [r,g,b],    // Farbe außerhalb der Welt (falls sky nicht gesetzt)
}
```

Gecacht pro Region + Größe + Abschnittszahl + Versatz – darf also **nicht von den Pflanzen
abhängen** (Belegung → `pieces`). Der Cache in `garden.js` ist ein LRU mit Pixel-Budget.
Teure pixelweise Böden **kachelweise in Inhaltskoordinaten cachen** (Vorbild: `floorTile` in
`wald.js`) und Formen (Ellipsen, Flecken) pro Kachel vorfiltern statt pro Pixel über alle zu
laufen – dann kosten neue Abschnitte, Filterwechsel und Resize nur die neuen Kacheln.

`Buf`: `set(x,y,rgb,a)`, `rect`, `hline`, `vline`, `ellipse`, `line`, `noisy`, `clear` (Loch für Himmel),
`glow(x,y,rgb)` (leuchtet nachts), `art(pixelArtOderSprite, x, y)` (wird nach den Pixeln gezeichnet), `finish()`.

## Zeichen-Ebenen (Renderer)

0. Himmel (wenn `sky`) → 1. Hintergrund (gegradet) → 2. Teile + Pflanzen z-sortiert (gegradet)
→ 3. Vordergrund `front` (gegradet) → 4. Licht: Strahlen, Leucht-Masken (`glow`), Lichthöfe →
animiertes FX (Glühwürmchen, Falter). Tag/Nacht = Multiplikation mit `L.mult` aus `sun.js`;
Innenraum-Zonen mit `indoorMult(L)`. Leuchtendes (Glow-Ebenen, `Buf.glow`, `halo`) bleibt nachts hell.

## Stilregeln (verbindlich)

- **Pixel:** ganzzahlige Koordinaten, keine Kantenglättung, keine Verläufe in Sprites
  (Verläufe nur für Licht im Renderer). 1 Welt-Pixel = 1 Sprite-Pixel; Pflanzen sind 32×32.
- **Paletten-Rampen:** jede Farbe kommt aus einer 5er-Rampe `[outline, shade, base, light, highlight]`.
  Vorhandene: `palette.js` (`C.<name>` als RGB, Namen in `PixelArt.layer('name')`). Eigene Rampen
  **lokal in der Regionsdatei** (`rgbRamp([...5 Hex])` für Buf, Hex-Array direkt für `layer([...])`).
- **Outline** in der dunkelsten Farbe der jeweiligen Rampe, nie Schwarz (`PixelArt`-Ebenen machen das).
- **Licht oben links:** helle Kanten oben/links, Schatten unten/rechts; Bodenschatten rechts unten.
- **Warm und cozy:** warme Holz-, Creme-, Terrakotta-, Moos- und Salbeitöne; Akzente sparsam
  (Rot/Blau/Gelb in kleinen Mengen). Nachts: warme Lichtinseln (Lampen, Kerzen, Laternen,
  Glühwürmchen) vor kühler Umgebung.
- **Pflanzen sind die Stars:** Deko kleiner und ruhiger als Pflanzen, nie davor/darüber.
  Keine Raster-Optik: Gruppen von 2–4, verschiedene Höhen, Lücken, Wege.
- **Animation sparsam:** nur kleine Lebewesen/Lichter; `prefers-reduced-motion` wird beachtet.
- **Nichts kopieren:** eigene Gestaltung, nur die Stimmung von Cozy-Games.
- Ruhige Flächen: Texturen mit wenig Kontrast (`mix()` statt harter Rampenwechsel), sonst flimmert es.

## Prüfen

- Tests: `node --test app/tests/*.test.mjs` (u. a. `app/tests/scenes.test.mjs`: Stabilität,
  Determinismus, Tipp-Regel, Deko-Regeln, Rendern aller Teile mit Canvas-Attrappe).
- Screenshots: `python3 /home/claude/rework_tools/shots.py REGION ANZAHL ZEIT AUS.png [--canvas] [--zoom N, nur mit ortZoomEnabled] [--tap]`
  oder `--batch REGION 0,8,60,300 12:00,22:30 PREFIX`. Meldet JS-Fehler.
- Spielstände: Mit v0.5 werden bestehende Pflanzen einmalig neu verteilt (neue Spots), danach stabil.

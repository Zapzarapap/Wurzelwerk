# Wurzelwerk – Pixel-Art-Style-Guide

Gilt für **alle** Sprites, damit der Look einheitlich bleibt, egal wer zeichnet.

## Format

- **32×32 px** pro Sprite, transparenter Hintergrund, PNG.
- Pflanze steht **unten mittig**. Topf-/Bodenfuß endet bei y = 31.
- Pflanzen mit Topf (Pflanzenhandlung, ggf. Gewächshaus): Standardtopf aus `parts.pot()`, Erde-Oberkante bei y = 24.
- Wiese: Grashügel `parts.meadow_ground()`. Wald: Moospolster `parts.forest_ground()`.
- 5 Stufen: 15 / 30 / 60 / 90 / 120 min. Stufe 5 nutzt den Rahmen fast voll aus, ohne abgeschnitten zu werden.

## Farben

- **Nur Rampen aus `tools/sprites/palette.py`.** Neue Farben dort als neue Rampe ergänzen (5 Töne: outline, shade, base, light, highlight).
- Outlines sind nie Schwarz, sondern die dunkelste Farbe des jeweiligen Materials.
- Farbige Blüten werden in `petal_red` gezeichnet und per Palettentausch (`VARIANTS`) eingefärbt. Nur natürlich vorkommende Farben der Art verwenden.

## Licht

- Licht kommt von **oben links**. Der Renderer setzt automatisch Licht (oben/links) und Schatten (unten/rechts) pro Ebene.
- Blätter: Die dem Licht zugewandte Hälfte ist heller (`heart_leaf` macht das automatisch).
- Tag/Nacht wird im Spiel per Farb-Grading gemacht, **nicht** in den Sprites. Sprites immer bei Tageslicht zeichnen.
- Was nachts leuchten soll (Glühpilze, Lampen), auf eine Ebene mit `glow=True` legen. Dann entsteht automatisch eine `_glow.png`-Maske.

## Aufbau

- Jedes Objekt (Blatt, Stiel, Hut, Topf …) ist eine eigene Ebene mit eigener Outline, damit Überlappungen lesbar bleiben.
- Dünne Stiele: 1 px, ohne Outline (`parts.stalk`).
- Lieber wenige, klar lesbare Formen als viele kleine. Auch bei 1× Zoom muss die Art erkennbar sein.

## Blattpflanzen (Monstera, Alocasia, Calathea …)

- Blätter **nicht nebeneinander aufreihen**, sondern natürlich wirken lassen:
  - unterschiedliche Größen (junge Blätter klein, alte groß)
  - Überlappungen, vordere Blätter verdecken hintere
  - unterschiedliche Höhen und Neigungen, einzelne Blätter hängen nach außen über
  - asymmetrisch, keine Spiegel-Anordnung
  - Stiele kreuzen sich teilweise

## Dateien

- Code: `tools/sprites/plants/<art>.py` mit `REGION`, `draw(stage)` und optional `VARIANTS`.
- Rendern: `python3 -I tools/sprites/preview.py <art>`
- Ausgabe: `art/sprites/<region>/<art>/stage<N>[_<variante>].png`, Vorschau: `art/preview/<art>.png`
- Gewächshaus zusätzlich ohne eigenen Beet-Fuß: `python3 -I tools/sprites/preview.py --nofoot <art>` → `stage<N>[_<variante>]_nofoot.png` (Erdpunkt bei y = 27). Die App setzt diese Sprites in die gezeichneten Beete. Nach Änderungen an Gewächshaus-Pflanzen beide Varianten rendern.
- Danach immer `python3 -I tools/build_manifest.py`.
- Referenzen: `monstera`, `mohn`, `fliegenpilz`.

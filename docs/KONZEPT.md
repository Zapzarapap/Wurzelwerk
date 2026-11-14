# Wurzelwerk – Konzept

Lernzeit-Tracker als Web-App (PWA) fürs iPhone, mit einem cosy Pixel-Art-Garten als Belohnung.
Im Kern geht es um **Statistiken**, das Pflanzenspiel läuft nebenbei.

## Plattform

- PWA, wird über Safari → „Zum Home-Bildschirm“ installiert.
- **Local-first:** Alle Daten liegen in IndexedDB auf dem Gerät. Kein Login, kein Server, läuft offline.
- `navigator.storage.persist()` wird beim Start angefragt.
- **Backup:** In den Einstellungen gibt es „Backup exportieren“ (JSON über die Web Share API → Dateien/iCloud/AirDrop) und „Backup importieren“.
- Die App erinnert an Backups („Letztes Backup vor X Tagen“).
- Hosting: GitHub Pages.
- Timer laufen über Zeitstempel (Start merken, beim Öffnen die Differenz berechnen), damit die Zeit auch bei gesperrtem Handy stimmt.

## Sessions

Beim Start einer Session wählt man:
1. **Tag** – selbst erstellt, z. B. „Lernen Uni“, „Bachelorarbeit“
2. **Region**
3. **Pflanze** (aus den freigeschalteten Arten der Region)
4. **Modus**
   - **Timer:** feste Dauer
   - **Endless:** läuft bis zum Stopp

### Wachstum

| Lernzeit | Stufe |
|---|---|
| < 15 min | nichts |
| 15 min | 1 – ganz klein |
| 30 min | 2 |
| 60 min | 3 – erkennbar |
| 90 min | 4 – halbwegs weit |
| 120 min | 5 – ausgewachsen |

- Im Endless-Modus beginnt nach 120 min eine **2. Pflanze derselben Art** für die Zeit über 120 min, nach 240 min eine 3. usw.
- Abbruch wird nicht bestraft: Die Pflanze erreicht die Stufe, die der gelernten Zeit entspricht.

## Statistiken (Kern)

- Lernzeit pro **Tag / Woche / Monat / Jahr**, aufgeschlüsselt nach Tag.

## Garten

- Gartenansicht pro Region, filterbar nach Zeitraum (Tag / Woche / Monat / Jahr, ggf. Gesamt) und nach Tag.
- Die Region **wächst mit der Anzahl der Pflanzen** (neue Parzellen, Regale, Lichtungen). Die Kamera zoomt automatisch passend, Pinch-Zoom für Details.
- Die Fläche füllt sich **zufällig, aber schön**: Poisson-Disc-Verteilung (keine Klumpen, keine Überlappung), Y-Sortierung für Tiefe, zufälliges Spiegeln.
- Jede Region hat ihren eigenen Look und eigene Erweiterungslogik.

### Tageszeit-Licht

- Die Region ist je nach **aktueller Uhrzeit** hell oder dunkel, mit fließenden Übergängen: Morgendämmerung → Tag → Abendrot → Nacht.
- Sonnenauf- und -untergang werden offline per Formel für Deutschland (~51° N) berechnet, damit sich das jahreszeitlich verschiebt (im Winter früher dunkel). Keine Standortabfrage nötig.
- Umsetzung im Renderer per Farb-Grading (Abdunkeln + Farbton), nicht als eigene Sprites pro Tageszeit.
- **Leuchtende Elemente** bleiben nachts hell: Sprites haben dafür eine optionale Leucht-Maske. Beispiele: Glühpilze im Wald, Lampen/Lichterketten in der Pflanzenhandlung, Glühwürmchen auf der Blumenwiese, Laternen im Gewächshaus.
- Innenräume (Pflanzenhandlung, Gewächshaus): Fenster bzw. Glasdach zeigen den Himmel, nachts gehen die Lampen an.

## Regionen und Pflanzen

Freischaltung über **Tokens** (verdient durch Lernzeit). Die Pflanzenhandlung ist die Startregion.

### Pflanzenhandlung (Start)
Zimmerpflanzen in Töpfen, Regale, Tische, Hängeampeln.
- Monstera
- Alocasia Black Velvet
- Alocasia Dragon Scale
- Jewel Alocasia *(Sorte offen – Vorschlag: Alocasia cuprea „Red Secret“)*
- Mask Alocasia (Alocasia amazonica „Polly“)
- Calathea 1 *(offen – Vorschlag: Calathea orbifolia)*
- Calathea 2 *(offen – Vorschlag: Calathea lancifolia)*
- Kaktus
- Sukkulente (Echeverie)

### Gewächshaus (kaufbar)
Gemüse und Kräuter in Beeten/Hochbeeten.
- Tomate
- Gurke
- Basilikum
- Melone
- Kürbis
- Chili

### Blumenwiese (kaufbar)
Locker verstreut. Farbige Blumen bekommen **zufällig eine ihrer natürlichen Farben**.
- Gänseblümchen
- Mohn
- Kornblume
- Lavendel
- Lilie
- Sonnenblume
- Edelnelke
- Rose
- Germini

### Wald (kaufbar)
Pilze in Gruppen unter Bäumen, Lichtungen.
- Fliegenpilz
- Steinpilz
- Pfifferling
- Butterpilz
- Farn
- Efeu
- Heidelbeerstrauch
- Moospolster mit Glühpilzen (selten/teuer)

**Summe:** 32 Arten × 5 Stufen = 160 Sprites (+ Farbvarianten per Palettentausch) + Boden-/Deko-Kacheln.

## Noch offen

- Token-Ökonomie: Kurs (Tokens pro Minute), Preise für Pflanzen und Regionen
- Start-Pflanzen pro Region
- Konkrete Sorten für Jewel Alocasia und die zwei Calatheen
- Gesamt-Ansicht im Garten ja/nein

# Wurzelwerk – Konzept

Lernzeit-Tracker als Web-App (PWA) fürs iPhone, mit cosy Pixel-Art-Orten (Pflanzenhandlung, Gewächshaus, Blumenwiese, Wald) als Belohnung.
Im Kern geht es um **Statistiken**, das Pflanzenspiel läuft nebenbei.

## Plattform

- PWA, wird über Safari → „Zum Home-Bildschirm“ installiert.
- **Local-first:** Alle Daten liegen in IndexedDB auf dem Gerät. Kein Login, kein Server, läuft offline.
- `navigator.storage.persist()` wird beim Start angefragt.
- **Backup:** Unter „Mehr“ (Einstellungen) gibt es „Backup exportieren“ (JSON über die Web Share API → Dateien/iCloud/AirDrop) und „Backup importieren“. Eine laufende Session wird weder exportiert noch importiert. Der Import prüft die Datei gründlich und meldet Fehler auf Deutsch.
- Die App erinnert an Backups („Letztes Backup vor X Tagen“): ab 7 Tagen (bzw. wenn es Sessions, aber noch kein Backup gibt) mit einem Punkt am „Mehr“-Tab und einem dezenten Hinweis auf der Lernen-Seite.
- Hosting: GitHub Pages.
- **Updates (ab v0.5.2):** Der Service Worker lädt eine neue Version im Hintergrund komplett in den Cache und wartet. Die App zeigt dann „Neue Version verfügbar – Neu laden“; Antippen aktiviert sie und lädt neu. Wartet beim Start schon eine neue Version, wird sie gleich aktiviert (kurzer Neustart, bevor etwas angezeigt wird). Alle Daten – auch eine laufende Session – liegen in IndexedDB, es geht nichts verloren. Ungefragt lädt die App nie neu. (Von v0.5.1 aus greift das erst ab dem übernächsten Start, weil die alte Version den Hinweis noch nicht kennt.)
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

## Tag nachträglich ändern (ab v0.5.4)

- **Statistik (Tagesansicht):** Antippen einer Session öffnet ein Sheet mit Details, „Tag ändern“ und „Löschen“. „Tag ändern“ zeigt die vorhandenen (nicht gelöschten) Tags als Chips, der aktuelle ist markiert; „Speichern“ ändert die Session und alle ihre Pflanzen in einer IndexedDB-Transaktion (Toast „Tag geändert“). Statistik und Orte aktualisieren sich sofort.
- **Orte:** Die Pflanzen-Info-Karte hat den Link „Tag ändern“ für die zugehörige Session. Hat die Session mehrere Pflanzen, wechseln alle mit (Hinweis im Sheet).
- Sessions mit gelöschtem Tag lassen sich auf einen vorhandenen Tag umstellen. Die laufende Session ist nicht betroffen.
- Tokens, Stufe, Minuten und Stellplatz bleiben unverändert: Der Platz hängt nur an der Pflanzen-ID, nicht am Tag.

## Statistiken (Kern)

- Lernzeit pro **Tag / Woche / Monat / Jahr**, aufgeschlüsselt nach Tag.

## Orte

Navigation: **Lernen · Statistik · Orte · Shop · Mehr**.

- Ansicht pro Region (Reiter mit kleinem Pflanzen-Marker), filterbar nach Zeitraum (Tag / Woche / Monat / Jahr, Gesamt) und nach Tag.
- **Plätze und Filter:** Die Stellplätze gelten für die Ansicht **„Gesamt“** (alle Tags): Dort steht jede Pflanze dauerhaft auf ihrem Platz, neue Pflanzen ändern daran nichts. Eine **Filteransicht** (Zeitraum oder Tag) zeigt nur die gefilterten Pflanzen und verteilt *diese* für sich auf eine passend kleine Fläche – dort kann eine Pflanze also woanders stehen als in „Gesamt“. Gewollt so: Ein gefilterter Tag/Monat soll kompakt aussehen statt als großer, fast leerer Ort.
- Die Region **wächst mit der Anzahl der Pflanzen** in Abschnitten (Zimmer, Beete, Wiesenstücke, Lichtungen). Die Kamera zoomt automatisch passend, Pinch-Zoom für Details. Die Fläche wird auf Bildschirmgröße erweitert (leere Abschnitte bzw. Umgebung), damit kein ungenutzter Rand bleibt; die Stellplätze der Pflanzen ändern sich dadurch nicht. Zoom-Buttons und Licht-/Anzahl-Anzeige sitzen in einer Leiste unter der Fläche und verdecken nichts.
- **Szenen-System** (ab v0.5, Details: `docs/SZENEN.md`): Jede Region ist ein eigenes Modul `app/js/scenes/<region>.js` mit organischen Stellplätzen auf verschiedenen Höhen (Regal, Fensterbank, Hängeampel, Bodengruppe, Beet, Lichtung …). Jede Pflanze bekommt einen zufälligen freien Stellplatz (Zufall aus der Pflanzen-ID); erst wenn alle belegt sind, kommt ein neuer Abschnitt dazu. **Pflanzen ziehen nie um.** Deko füllt freie Plätze und macht Pflanzen Platz.
- **Pflanzenhandlung:** ein Haus im Querschnitt (Puppenhaus): Laden mit Schaufenster, Regal, Hängeampel und Theke; danach wachsen Leseecke, Werkstatt mit Pflanztisch, Wintergarten und Treppenhaus als Etagen und Anbauten dazu, mit Dächern, Gehweg und Laterne. **Gewächshaus:** Erdbeete mit Holzrand. **Blumenwiese/Wald:** locker gestreut in Wiesen- bzw. Waldstücken.
- Jede Region hat ihren eigenen Look und eigene Erweiterungslogik.

### Tageszeit-Licht

- Die Region ist je nach **aktueller Uhrzeit** hell oder dunkel, mit fließenden Übergängen: Morgendämmerung → Tag → Abendrot → Nacht.
- Sonnenauf- und -untergang werden offline per Formel für Deutschland (~51° N) berechnet, damit sich das jahreszeitlich verschiebt (im Winter früher dunkel). Keine Standortabfrage nötig.
- Umsetzung im Renderer per Farb-Grading (Abdunkeln + Farbton), nicht als eigene Sprites pro Tageszeit.
- **Leuchtende Elemente** bleiben nachts hell: Sprites haben dafür eine optionale Leucht-Maske. Beispiele: Glühpilze im Wald, Lampen/Lichterketten in der Pflanzenhandlung, Glühwürmchen auf der Blumenwiese, Laternen im Gewächshaus.
- Innenräume (Pflanzenhandlung, Gewächshaus): Fenster bzw. Glasdach zeigen den Himmel, nachts gehen die Lampen an.

## Regionen und Pflanzen

Freischaltung über **Tokens** im **Shop** (verdient durch Lernzeit). Die Pflanzenhandlung ist die Startregion.

### Token-Ökonomie

- 1 Token pro Lernminute.
- **Faustregel:** Keine Pflanze und keine Region kostet mehr als **5 h Lernzeit (300 Tokens)**; die günstigsten Pflanzen gibt es nach 1,5 h (90 Tokens). Regionen kosten 300 Tokens und enthalten 1 Gratis-Pflanze. Preise: `app/js/config.js`.
- Der Kontostand wird nie negativ. Wird eine Session gelöscht, deren Tokens schon ausgegeben sind, bleibt der Stand bei 0 und gekaufte Pflanzen bleiben erhalten (Ausgleich über `kv.tokenAdjust`). Der Lösch-Dialog weist darauf hin.

### Pflanzenhandlung (Start)
Zimmerpflanzen in Töpfen, Regale, Tische, Hängeampeln.
- Monstera
- Alocasia Black Velvet
- Alocasia Dragon Scale
- Jewel Alocasia *(Aussehen: nach Referenzbild von Niklas)*
- Mask Alocasia (Alocasia amazonica „Polly“)
- Calathea orbifolia
- Calathea lancifolia
- Kaktus
- Sukkulente (Echeverie)
- Pilea
- Strelitzie
- Bonsai
- Venusfliegenfalle
- Orchidee

### Gewächshaus (kaufbar)
Gemüse und Kräuter in Beeten/Hochbeeten.
- Tomate
- Gurke
- Basilikum
- Melone
- Kürbis
- Chili
- Erdbeere
- Paprika
- Aubergine
- Zucchini
- Mais

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
- Tulpe
- Vergissmeinnicht
- Fingerhut
- Mohnfeld
- Pusteblume

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
- Maiglöckchen
- Hexenring (selten/teuer)
- Walderdbeere
- Bärlauch
- Zunderschwamm

**Summe:** 52 Grundarten (14 + 11 + 14 + 13), mit den Bonus-Arten (unten) 72 Arten (19 + 16 + 19 + 18) × 5 Stufen = 360 Sprites (+ 109 Farbvarianten bei 33 Arten per Palettentausch) + Boden-/Deko-Kacheln.

## Noch offen

- Feinjustierung der Preise nach den ersten Wochen Nutzung
- Start-Pflanzen pro Region
- Referenzbilder für die Alocasien
- Gesamt-Ansicht über alle Orte ja/nein


## Bonus-Arten (v0.5.1, je 5 pro Region → 72 Arten)

- Pflanzenhandlung: Efeutute, Gummibaum, Bogenhanf, Anthurie, Philodendron Pink Princess
- Gewächshaus: Karotte, Salat, Erbsen, Radieschen, Rosmarin
- Blumenwiese: Dahlie, Ringelblume, Glockenblume, Duftwicke, Schwertlilie
- Wald: Tannensetzling, Waldmeister, Parasolpilz, Preiselbeere, Buschwindröschen

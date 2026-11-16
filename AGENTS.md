# Windgleiter Add-on

## Architektur

Das Projekt ist ein Minecraft-Bedrock-Add-on mit einem Behavior Pack und einem Resource Pack.
Das Attachable in `resource_packs/windglider_rp/attachables/glider.player.json` blendet nur das gefaltete Handmodell in der Ichperspektive über seine bedingte Animation aus. Die Außenansicht und das Inventarsymbol dürfen dabei nicht verschwinden; kein Hotbar-Cooldown zur Darstellungssteuerung verwenden.
Das unabhängige `glider:guide_book` entsteht an der Werkbank aus Buch und Feder plus Papier. `guide-book-ui.js` zeigt drei lokalisierte Seiten über `@minecraft/server-ui` 2.0.0; `guide-book.js` hält die reine Seitennavigation. Der Gleiter wird für das Rezept weder benötigt noch verbraucht.
Die reine Fluglogik liegt in `src/flight/GliderStateMachine.mjs` und wird durch Node-Tests ohne Minecraft ausgeführt.
`behavior_packs/windglider_bp/scripts/main.js` adaptiert die stabile Bedrock Script API auf diesen Zustandsautomaten.
`behavior_packs/windglider_bp/scripts/display.js` verwaltet die separate Segel-Darstellung mit erneutem Spawn-Versuch im Spieltick. `DISPLAY_LEAD_DISTANCE` bestimmt den Vorlauf des Schirms in Flugrichtung und muss im Realm visuell geprüft werden.
Außerhalb der Dimensionshöhe wird die Anzeige ohne Spawn-Versuch ausgesetzt und nach Rückkehr in den gültigen Bereich neu erzeugt.
`behavior_packs/windglider_bp/scripts/wall-collision.js` erkennt blockierte Vorwärtsbewegung an einer Wand und beendet den Flug.
`behavior_packs/windglider_bp/scripts/jump-activation.js` begrenzt den Abstand zweier Sprung-Tastendrücke beim Öffnen auf 8 Ticks.
`behavior_packs/windglider_bp/scripts/fire-updraft.js` erkennt normales Feuer, brennende Lagerfeuer und sichtbare Lava in einer offenen Luftsäule. Ein Cache pro Spieler begrenzt die Vollsuche auf einmal je 3 Ticks; Quelle und Luftweg werden dazwischen weiter geprüft. Der unabhängige `thermalRoute`-Zustand erlaubt vier getrennte Aufwindbereiche, danach 200 Ticks Pause und weitere Bereiche während desselben Flugs. Vier aufeinanderfolgende Ticks ohne Wärme trennen Bereiche; kurze Scanlücken und benachbarte Quellen zählen nicht neu. Landung setzt eine unvollständige Serie zurück, lässt aber die Pause nach dem vierten Bereich weiterlaufen. Einklappen in der Luft setzt beides nicht zurück. `main.js` übergibt die begrenzte Stärke nur beim Gleiten an `flight.js` und löscht den Quellen-Cache beim Flugende. Die Flugberechnung liegt zusätzlich in `src/flight/GliderStateMachine.mjs`; beide Implementierungen müssen synchron bleiben. Aufwindradien, Höhe und Pausenlänge stehen in `THERMAL_CONFIG`, die maximale Steigrate in `GLIDER_CONFIG.updraftRiseSpeed`.

## Befehle

- `npm test` – Zustandsautomat und Flugberechnung testen
- `npm run assets` – Modell und UV-Textur reproduzierbar erzeugen
- `npm run validate` – JSON, Pack-Abhängigkeiten, Ressourcen und Rezept prüfen
- `npm run build` – Assets erzeugen, prüfen und `dist/windgleiter.mcaddon` mit zwei `.mcpack`-Dateien bauen

## Dienste und Datenhaltung

Es gibt keine externen Dienste und keine Datenbank. Spielerzustände leben nur für die Laufzeit der Welt.
Verwaiste Anzeige-Entitäten werden beim Script-Start und beim Beenden eines Fluges entfernt.

## Deployment

Die Ausgabe `dist/windgleiter.mcaddon` wird am PC in Minecraft importiert. Danach werden Behavior- und Resource-Pack
für die Testwelt und anschließend für den Realm aktiviert. Die Pack-UUIDs und die Item-ID bleiben bei Updates stabil.
Eine Produktivwelt wird vor dem ersten Realm-Update gesichert.

Bei jeder Änderung an einem ausgelieferten Pack die Version beider Packs, ihrer Module und gegenseitigen Abhängigkeiten
sowie die Projektversion in `package.json` synchron erhöhen. Das Archiv neu bauen und den Import sowie die tatsächlich
aktivierte Version in einer Weltkopie prüfen. Die Script-API-Abhängigkeit hat ihre eigene unabhängige Version.

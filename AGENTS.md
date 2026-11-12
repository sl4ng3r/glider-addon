# Windgleiter Add-on

## Architektur

Das Projekt ist ein Minecraft-Bedrock-Add-on mit einem Behavior Pack und einem Resource Pack.
Die reine Fluglogik liegt in `src/flight/GliderStateMachine.mjs` und wird durch Node-Tests ohne Minecraft ausgeführt.
`behavior_packs/windglider_bp/scripts/main.js` adaptiert die stabile Bedrock Script API auf diesen Zustandsautomaten.
`behavior_packs/windglider_bp/scripts/display.js` verwaltet die separate Segel-Darstellung mit erneutem Spawn-Versuch im Spieltick.
Außerhalb der Dimensionshöhe wird die Anzeige ohne Spawn-Versuch ausgesetzt und nach Rückkehr in den gültigen Bereich neu erzeugt.
`behavior_packs/windglider_bp/scripts/wall-collision.js` erkennt blockierte Vorwärtsbewegung an einer Wand und beendet den Flug.
`behavior_packs/windglider_bp/scripts/jump-activation.js` begrenzt den Abstand zweier Sprung-Tastendrücke beim Öffnen auf 8 Ticks.

## Befehle

- `npm test` – Zustandsautomat und Flugberechnung testen
- `npm run assets` – Modell und UV-Textur reproduzierbar erzeugen
- `npm run validate` – JSON, Pack-Abhängigkeiten, Ressourcen und Rezept prüfen
- `npm run build` – Assets erzeugen, prüfen und `dist/windgleiter.mcaddon` bauen

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

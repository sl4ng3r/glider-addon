# Windgleiter

Ein Bedrock-Add-on für einen eigenen Holz-Stoff-Gleiter mit automatischem Vortrieb, träger Links-/Rechts-Lenkung und einer 0,3-sekündigen Öffnungsanimation.

## Entwicklung

```sh
npm test
npm run validate
npm run build
```

Das fertige Add-on liegt danach unter `dist/windgleiter.mcaddon`. Es enthält je eine importierbare `.mcpack`-Datei für Spiellogik und Ressourcen.

## Bedienung

- Gleiter auswählen: in der Außenansicht gefaltet in der Hand sichtbar; in der Ichperspektive bleibt die Sicht auf den Flugweg frei. Das Inventarsymbol bleibt sichtbar.
- Kurzer Sprung: normal abspringen; innerhalb von 0,4 Sekunden erneut Springen drücken, um die Öffnung zu starten.
- Längerer Sturz: nach mindestens 0,8 Sekunden in der Luft genügt ein Druck auf Springen, auch wenn der erste Sprung schon länger zurückliegt oder der Gleiter erst im Fall ausgewählt wurde.
- Erneut Springen: Öffnung abbrechen oder geöffneten Gleiter einklappen.
- Trifft der geöffnete Gleiter frontal auf eine Wand, klappt er ein und der normale Fall beginnt. Er lässt sich erst nach der Landung erneut öffnen.
- Links/Rechts: sanfte Kurven.
- Ohne seitliche Eingabe richtet sich der Flug langsam zur horizontalen Blickrichtung aus.
- Vorwärts/Rückwärts: beeinflusst den automatischen Vortrieb nicht.
- Über normalem Feuer, brennenden Lagerfeuern und sichtbarer Lava trägt ein Aufwind den **geöffneten** Gleiter nach oben. Das Feuer muss unter freiem Luftraum liegen; Dächer und verdeckte Lava blockieren den Aufwind.

Vier getrennte Aufwindbereiche mit zunächst etwa **9 Blöcken Abstand** bilden einen Abschnitt einer Gleiterstraße. Benachbarte Feuerstellen addieren ihre Stärke nicht und zählen als ein Bereich. Nach dem vierten Bereich folgt eine Pause von **200 Spielticks (etwa 10 Sekunden)** ohne Aufwind. Danach sind während desselben Flugs weitere vier Bereiche nutzbar. Landen setzt eine angefangene Vierer-Serie zurück, aber eine Pause nach dem vierten Bereich läuft auch am Boden weiter. Einklappen in der Luft setzt weder die Serie noch die Pause zurück.

Die Aufwindstärke nimmt seitlich und mit der Höhe ab: voller Aufwind bis 2 Blöcke seitlichem Abstand und 17 Blöcke über der Quelle, danach auslaufend bis 3,5 beziehungsweise 24 Blöcke. Die maximale Ziel-Steigrate beträgt 18,25 Blöcke pro Sekunde, damit der Höhengewinn trotz höherer Fluggeschwindigkeit etwa gleich bleibt. Ein einzelnes Lagerfeuer bringt im Modell bei geradem Überflug ungefähr 13 Blöcke Höhengewinn; die tatsächlich erreichte Höhe hängt auch von Minecraft-Physik, Flugweg und Spieltempo ab und muss im Spiel geprüft werden. Seelenfeuer, Seelenlagerfeuer, Magmablöcke und erloschene Lagerfeuer geben keinen Aufwind.

Der normale Gleitflug hat 7,5 Blöcke Vortrieb pro Sekunde. Die maximale Drehung über Links/Rechts beträgt 18 Grad pro Sekunde; ohne seitliche Eingabe folgt der Gleiter dem Blick mit höchstens 9 Grad pro Sekunde.

Die Kurzbedienung steht in der Pack-Beschreibung. Während des Spiels erscheinen keine eigenen Statusmeldungen in der Aktionsleiste.

Ein unabhängiges, lesbares **Wind Glider Guide**-Buch lässt sich an der Werkbank aus **Buch und Feder + Papier** herstellen. Mit Benutzen öffnet sich eine Seite mit kurzen Hinweisen zu Gleiten und Aufwind. Die Texte und Schaltflächen folgen der gewählten Minecraft-Sprache: Englisch ist der Standard, Deutsch wird unterstützt. Das Buch ist auch im Kreativinventar und mit `/give @s glider:guide_book` verfügbar.

Die Pack- und Testanleitung liegt in `docs/controls.md`.

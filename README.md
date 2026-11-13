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

- Gleiter auswählen: gefaltet in der Hand sichtbar.
- Kurzer Sprung: normal abspringen; innerhalb von 0,4 Sekunden erneut Springen drücken, um die Öffnung zu starten.
- Längerer Sturz: nach mindestens 0,8 Sekunden in der Luft genügt ein Druck auf Springen, auch wenn der erste Sprung schon länger zurückliegt oder der Gleiter erst im Fall ausgewählt wurde.
- Erneut Springen: Öffnung abbrechen oder geöffneten Gleiter einklappen.
- Trifft der geöffnete Gleiter frontal auf eine Wand, klappt er ein und der normale Fall beginnt. Er lässt sich erst nach der Landung erneut öffnen.
- Links/Rechts: sanfte Kurven.
- Ohne seitliche Eingabe richtet sich der Flug langsam zur horizontalen Blickrichtung aus.
- Vorwärts/Rückwärts: beeinflusst den automatischen Vortrieb nicht.
- Über normalem Feuer, brennenden Lagerfeuern und sichtbarer Lava trägt ein Aufwind den **geöffneten** Gleiter nach oben. Das Feuer muss unter freiem Luftraum liegen; Dächer und verdeckte Lava blockieren den Aufwind.

Vier Lagerfeuer mit zunächst etwa **9 Blöcken Abstand** bilden einen möglichen Gleiterweg. Die Aufwindstärke nimmt seitlich und mit der Höhe ab: voller Aufwind bis 1,5 Blöcke seitlichem Abstand und 5 Blöcke über der Quelle, danach auslaufend bis 2,5 beziehungsweise 8 Blöcke. Die maximale Steigrate beträgt ungefähr 2,5 Blöcke pro Sekunde; die tatsächliche Reichweite hängt von Flugweg und Spieltempo ab und muss im Spiel abgestimmt werden. Seelenfeuer, Seelenlagerfeuer, Magmablöcke und erloschene Lagerfeuer geben keinen Aufwind.

Die Kurzbedienung steht in der Pack-Beschreibung. Während des Spiels erscheinen keine eigenen Statusmeldungen in der Aktionsleiste.

Die Pack- und Testanleitung liegt in `docs/controls.md`.

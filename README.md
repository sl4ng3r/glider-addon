# Windgleiter

Ein Bedrock-Add-on für einen eigenen Holz-Stoff-Gleiter mit automatischem Vortrieb, träger Links-/Rechts-Lenkung und einer 0,3-sekündigen Öffnungsanimation.

## Entwicklung

```sh
npm test
npm run validate
npm run build
```

Das fertige Add-on liegt danach unter `dist/windgleiter.mcaddon`.

## Bedienung

- Gleiter auswählen: gefaltet in der Hand sichtbar.
- Erster Sprung: normal abspringen; innerhalb von 0,4 Sekunden erneut Springen drücken, um die Öffnung zu starten. Wer ohne Sprung von einer Kante fällt, kann den Gleiter mit einem Druck in der Luft öffnen.
- Erneut Springen: Öffnung abbrechen oder geöffneten Gleiter einklappen.
- Trifft der geöffnete Gleiter frontal auf eine Wand, klappt er ein und der normale Fall beginnt.
- Links/Rechts: sanfte Kurven.
- Ohne seitliche Eingabe richtet sich der Flug langsam zur horizontalen Blickrichtung aus.
- Vorwärts/Rückwärts: beeinflusst den automatischen Vortrieb nicht.

Die Kurzbedienung steht in der Pack-Beschreibung. Während des Spiels erscheinen keine eigenen Statusmeldungen in der Aktionsleiste.

Die Pack- und Testanleitung liegt in `docs/controls.md`.

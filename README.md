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
- Erster Sprung: normal abspringen; ein weiterer Sprung in der Luft startet die Öffnung für 0,3 Sekunden.
- Erneut Springen: Öffnung abbrechen oder geöffneten Gleiter einklappen.
- Links/Rechts: sanfte Kurven.
- Ohne seitliche Eingabe richtet sich der Flug langsam zur horizontalen Blickrichtung aus.
- Vorwärts/Rückwärts: beeinflusst den automatischen Vortrieb nicht.

Die Pack- und Testanleitung liegt in `docs/controls.md`.

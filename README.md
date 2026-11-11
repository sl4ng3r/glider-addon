# Windgleiter

Ein Bedrock-Add-on für einen eigenen Holz-Stoff-Gleiter mit automatischem Vortrieb, träger Links-/Rechts-Lenkung und einer einsekündigen Öffnungsanimation.

## Entwicklung

```sh
npm test
npm run validate
npm run build
```

Das fertige Add-on liegt danach unter `dist/windgleiter.mcaddon`.

## Bedienung

- Gleiter auswählen: gefaltet in der Hand sichtbar.
- In der Luft Springen: Öffnen beginnt und dauert eine Sekunde.
- Erneut Springen: Öffnung abbrechen oder geöffneten Gleiter einklappen.
- Links/Rechts: sanfte Kurven.
- Vorwärts/Rückwärts: beeinflusst den automatischen Vortrieb nicht.

Die Pack- und Testanleitung liegt in `docs/controls.md`.

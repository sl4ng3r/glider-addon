# Windgleiter testen und installieren

1. `npm run build` ausführen und die neue Datei `dist/windgleiter.mcaddon` in Minecraft Bedrock importieren. Das Archiv enthält beide Packs als `.mcpack`-Dateien.
2. In einer Kopie der Welt beide Packs aktivieren und `/give @s glider:glider` ausführen.
3. Bei einem normalen Sprung innerhalb von 8 Ticks (0,4 Sekunden) erneut die Sprungtaste drücken. Wer schon mindestens 16 Ticks (0,8 Sekunden) in der Luft ist, kann den Gleiter mit einem einzigen Druck öffnen. Das gilt auch nach einem Sprung vom Berg oder wenn der Gleiter erst während des Falls ausgewählt wurde. Vor Ablauf dieser Zeit sind zwei schnelle Tastendrücke nötig.
4. Die Öffnung dauert 6 Ticks (0,3 Sekunden). Vor Ablauf gibt es keinen Fallschutz.
5. Im Flug mit Links/Rechts sanft kurven. Ohne seitliche Eingabe folgt der Gleiter langsam der horizontalen Blickrichtung. Der Vortrieb bleibt ohne Vorwärtseingabe erhalten.
6. Erneut springen, um den Gleiter einzuklappen und den freien Fall zu testen.
7. Bei einem frontalen Wandaufprall klappt der Gleiter ebenfalls ein.

Oberhalb der Bauhöhen-Grenze bleibt die Flugfunktion aktiv, aber das separate Schirmmodell wird erst wieder innerhalb der gültigen Dimensionshöhe angezeigt.

Für PS5 wird die importierte Welt über einen Realm bereitgestellt. Der Realm wird erst nach den lokalen Tests aktualisiert.
Mitspieler laden die aktivierten Packs beim Beitritt herunter. Bei einem Update bleiben Pack-UUIDs und `glider:glider` erhalten.

Beim Update zuerst eine Weltkopie anlegen, die neue `.mcaddon` importieren und in der Kopie prüfen, dass beide aktiven Windgleiter-Packs **1.0.25** anzeigen. Falls weiterhin eine ältere Version aktiv ist, diese in den Welteinstellungen deaktivieren und die neue Version aktivieren. Anschließend das Inventarsymbol und `/give @s glider:glider` prüfen. Den Realm erst nach erfolgreichem lokalem Test aktualisieren.

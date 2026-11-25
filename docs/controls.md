# Windgleiter testen und installieren

1. `npm run build` ausführen und die neue Datei `dist/windgleiter.mcaddon` in Minecraft Bedrock importieren. Das Archiv enthält beide Packs als `.mcpack`-Dateien.
2. In einer Kopie der Welt beide Packs aktivieren und `/give @s glider:glider` ausführen.
3. Bei einem normalen Sprung innerhalb von 10 Ticks (0,5 Sekunden) erneut die Sprungtaste drücken. Wer schon mindestens 16 Ticks (0,8 Sekunden) in der Luft ist, kann den Gleiter mit einem einzigen Druck öffnen. Das gilt auch nach einem Sprung vom Berg oder wenn der Gleiter erst während des Falls ausgewählt wurde. Vor Ablauf dieser Zeit sind zwei schnelle Tastendrücke nötig.
4. Die Öffnung dauert 6 Ticks (0,3 Sekunden). Vor Ablauf gibt es keinen Fallschutz.
5. Im Flug mit Links/Rechts sanft kurven. Ohne seitliche Eingabe folgt der Gleiter langsam der horizontalen Blickrichtung. Der Vortrieb bleibt ohne Vorwärtseingabe erhalten.
6. Erneut springen, um den Gleiter einzuklappen und den freien Fall zu testen.
7. Bei einem frontalen Wandaufprall klappt der Gleiter ebenfalls ein. Bis zur Landung kann er nicht wieder geöffnet werden; auch mehrfaches Springen ändert daran nichts.
8. Mit geöffnetem Gleiter über normales Feuer, ein brennendes Lagerfeuer oder sichtbare stehende beziehungsweise fließende Lava gleiten. Ein Dach oder eine Abdeckung über der Quelle verhindert den Aufwind. Beim geraden Überflug eines einzelnen Lagerfeuers aus ungefähr 5 Blöcken Höhe liegt der Zielwert im Modell bei etwa 13,5 Blöcken Höhengewinn. Vier getrennte Lagerfeuer auf derselben Höhe hintereinander überfliegen. Ein fünftes weniger als zehn Blöcke über dem ersten darf während der 200 Spielticks Pause keinen Aufwind geben. Dasselbe fünfte Lagerfeuer mindestens zehn Blöcke über das erste setzen und die Strecke erneut fliegen. Dann soll es direkt Aufwind geben. Die Pause auch mit einer durchgehenden Feuerreihe auf gleicher Höhe testen. Ab 24 Blöcken über der Oberkante einer Quelle darf sie nicht mehr wirken. Benachbarte Feuerstellen dürfen keinen zusätzlichen Schub geben. Erloschene Lagerfeuer, Seelenfeuer, Seelenlagerfeuer und Magmablöcke dürfen keinen Auftrieb erzeugen.
9. Den Gleiter auswählen und zwischen Ich- und Außenansicht wechseln: In der Ichperspektive darf das gefaltete Handmodell nicht sichtbar sein. In der Außenansicht muss es weiterhin an der Hand sitzen. Inventar- und Hotbar-Symbol müssen in beiden Ansichten sichtbar bleiben. Beim Gleiten bleibt das separate Schirmmodell bestehen.
10. An der Werkbank ohne Zutaten unter „Alle Anleitungen“ sowohl Gleiter als auch Handbuch suchen. Mit den nötigen Zutaten die Herstellbarkeit prüfen. Ein Buch und Feder mit einem Blatt Papier zu `glider:guide_book` verarbeiten. Das Buch ohne Gleiter im Inventar benutzen. Die eine Seite mit den Bereichen Gleiten und Aufwind lesen, schließen und erneut öffnen. Englisch und Deutsch in den Spracheinstellungen testen; bei anderen Sprachen englische Texte prüfen. Icon und Namen im Inventar und Rezeptbuch kontrollieren.

Oberhalb der Bauhöhen-Grenze bleibt die Flugfunktion aktiv, aber das separate Schirmmodell wird erst wieder innerhalb der gültigen Dimensionshöhe angezeigt.

Für PS5 wird die importierte Welt über einen Realm bereitgestellt. Der Realm wird erst nach den lokalen Tests aktualisiert.
Mitspieler laden die aktivierten Packs beim Beitritt herunter. Bei einem Update bleiben Pack-UUIDs und `glider:glider` erhalten.

Mit einem Controller im freien Luftraum gleiten und die Kamera neigen. Prüfen, ob beim Blick auf das eigene Segel ein ZR-Hinweis erscheint und ob das Segel in der Außenansicht sichtbar bleibt.

Beim Update zuerst eine Weltkopie anlegen, die neue `.mcaddon` importieren und in der Kopie prüfen, dass beide aktiven Windgleiter-Packs **1.0.45** anzeigen. Falls weiterhin eine ältere Version aktiv ist, diese in den Welteinstellungen deaktivieren und die neue Version aktivieren. Anschließend das Inventarsymbol und `/give @s glider:glider` prüfen. Den Realm erst nach erfolgreichem lokalem Test aktualisieren.

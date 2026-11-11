# Windgleiter testen und installieren

1. `npm run build` ausführen und `dist/windgleiter.mcaddon` in Minecraft Bedrock importieren.
2. In einer Kopie der Welt beide Packs aktivieren und `/give @s glider:glider` ausführen.
3. Von einer Höhe springen, den Windgleiter auswählen und nach dem Absprung die Sprungtaste drücken.
4. Die Öffnung dauert 20 Ticks. Vor Ablauf gibt es keinen Fallschutz.
5. Im Flug nur Links/Rechts zum Kurvenflug verwenden. Der Vortrieb bleibt ohne Vorwärtseingabe erhalten.
6. Erneut springen, um den Gleiter einzuklappen und den freien Fall zu testen.

Für PS5 wird die importierte Welt über einen Realm bereitgestellt. Der Realm wird erst nach den lokalen Tests aktualisiert.
Mitspieler laden die aktivierten Packs beim Beitritt herunter. Bei einem Update bleiben Pack-UUIDs und `glider:glider` erhalten.

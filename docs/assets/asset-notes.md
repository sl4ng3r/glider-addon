# Windgleiter-Assets

Die Vorschaubilder und das Inventarsymbol wurden für dieses Projekt mit ImageGen erzeugt und auf die Bedrock-Zielgrößen skaliert:

- `windglider-title.png`: 1920 × 1080, Titel- und Dokumentationsbild
- `behavior_packs/windglider_bp/pack_icon.png`: 256 × 256, Behavior-Pack-Vorschau
- `resource_packs/windglider_rp/pack_icon.png`: 256 × 256, Resource-Pack-Vorschau
- `resource_packs/windglider_rp/textures/items/wind_glider.png`: 32 × 32, transparentes Inventarsymbol

Der 64 × 64 Pixel große UV-Atlas `resource_packs/windglider_rp/textures/entity/wind_glider.png` für Holzrahmen und Stoffsegel wird zusammen mit der Modellgeometrie aus `tools/generate-model-texture.mjs` erzeugt (`npm run assets`). Das Titelbild wird nicht als Laufzeittextur verwendet.

Es wurden keine externen Bilder, Logos oder geschützten Minecraft-/Zelda-Dateien übernommen. Die Geräusche sind kurze, lokal erzeugte PCM-WAV-Dateien; ihr Generator liegt unter `tools/generate-sounds.mjs`.

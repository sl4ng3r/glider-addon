# Fire Updraft Design

## Intent

Players should be able to build routes of campfires that help an open Wind Glider stay aloft. An updraft over visible heat should give a noticeable but bounded rise while the existing automatic forward flight and steering continue.

## Agreed behavior

- Sources: `minecraft:fire`, a lit `minecraft:campfire`, and exposed `minecraft:lava` or `minecraft:flowing_lava`. Extinguished campfires, soul fire, soul campfires, magma, and hidden lava do not count.
- Only the fully open, gliding state receives lift. Selecting the item, the 6-tick opening phase, a closed glider, and a wall-locked fall receive none. Existing collision, landing, effect, and input cleanup remain in force.
- A source needs an open air column to the player; a solid ceiling over it blocks lift. Lava must have air immediately above its surface. A blocked player headroom also suppresses upward motion. Fire can still burn the player; this feature does not grant fire protection.
- Initial tuning: full strength within 1.5 blocks horizontally and up to 5 blocks above the source top; strength tapers linearly to zero at 2.5 blocks horizontally or 8 blocks vertically. At full strength the target vertical speed is **+2.5 blocks/second**; outside the field the existing **−1.5 blocks/second** descent applies. Horizontal speed stays **7 blocks/second**. Multiple sources use the strongest field, never additive lift.
- The field ends above its height limit, so circling a fire cannot raise the player indefinitely. The initial route target is a row of lit campfires roughly **9 blocks apart**, starting about **4 blocks above** them. Actual spacing and lift need in-game tuning.
- The source search runs at most once every 3 ticks per gliding player; its cached source and open column are rechecked each tick. Detection may begin up to 3 ticks after entering a new field. A removed or extinguished source stops contributing on the next tick.
- Existing canopy, fire, campfire, and lava visuals provide the cue. No new item, texture, sound, particle system, or UI message is required for this feature. German and English pack descriptions and controls documentation explain the updraft.

## Technical constraints

- Preserve the current `glider:glider` ID and both pack UUIDs. Next release from the clean 1.0.26 checkout is 1.0.27; if another release lands first, use the next patch version and synchronize both manifests, their modules and cross-pack dependencies, `package.json`, and the built archive.
- Keep Bedrock `min_engine_version` `[1, 21, 90]` and stable `@minecraft/server` `2.0.0`; no experimental APIs. Use `Dimension.getBlock`, `Block.typeId`, `Block.isAir`, and `Block.permutation.getState("extinguished")`. `Dimension.getBlocks` is not available in API 2.0.0.
- Query at most 25 horizontal columns × 8 blocks per scheduled search; skip out-of-range or unloaded blocks without interrupting other players. Keep state per player and dimension. The existing Minecraft/Realm runtime remains the only runtime; Docker Compose does not apply to this add-on.
- Automated tests cover source classification, geometry, occlusion, cache/error handling, flight physics, and pack export. Manual PC world-copy testing precedes a separate Realm test with PC and PS5; an archive build alone does not establish gameplay compatibility.

## Evidence and open validation

The [Bedrock block listing](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable) lists `fire`, `campfire` with `extinguished`, `lava`, and `flowing_lava`. The [stable Dimension API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/dimension?view=minecraft-bedrock-stable) documents `getBlock` and its unloaded/out-of-world failure cases; the [API changelog](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/changelog?view=minecraft-bedrock-stable) records removal of `getBlocks` in 2.0.0. The rise speed, field size, and route spacing are design starting values, not verified Bedrock playtest results.

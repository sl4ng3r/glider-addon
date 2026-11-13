# Fire Updraft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an open Wind Glider gain bounded height above visible fire, lit campfires, and exposed lava so players can build routes of campfires.

**Architecture:** A small Behavior Pack module reads nearby blocks and returns a normalized updraft strength. Both existing flight implementations convert that strength to vertical target speed while preserving forward flight; `main.js` owns one scan cache per player and supplies the strength only during gliding.

**Tech Stack:** Minecraft Bedrock Script API `@minecraft/server` 2.0.0, JavaScript ES modules, Node test runner, existing `.mcaddon` build.

**Spec:** [Fire Updraft Design](../specs/2026-11-13-fire-updraft-design.md)

## Global Constraints

- Minimum Bedrock version: `[1, 21, 90]`; stable `@minecraft/server` version: `2.0.0`; no experimental APIs.
- Sources: `minecraft:fire`, lit `minecraft:campfire`, exposed `minecraft:lava`, and exposed `minecraft:flowing_lava`. Exclude extinguished campfires, soul variants, magma, and hidden lava.
- Full field: horizontal radius `1.5` blocks and height `5` blocks; linear fade to zero at radius `2.5` or height `8`. Full-strength target rise `+2.5` blocks/second; ordinary descent `−1.5` blocks/second; forward speed `7` blocks/second.
- Scan only a fully open glider, at most once per `3` ticks; at most `25 × 8` block positions per scan. Recheck the cached source and air path every tick. Multiple sources use maximum strength, never a sum.
- Keep `glider:glider` and both pack UUIDs stable. Starting from version `1.0.26`, release `1.0.27` in both manifests, every pack module and cross-pack dependency, `package.json`, and `dist/windgleiter.mcaddon`; re-check HEAD before applying if another release landed.
- Preserve English default and German translation. Minecraft/Realm is the runtime; Docker Compose and database setup do not apply to this add-on.

## Review Focus

- An extinguished or removed cached campfire must stop lift on the next tick: Task 1 tests `cached_source_extinguished_stops_lift`.
- A roof or covered lava must not push a player upward or through blocks: Task 1 tests `roof_and_headroom_block_lift` and `covered_lava_has_no_lift`.
- Out-of-world or unloaded block reads must produce zero lift without stopping another player: Task 1 tests `unavailable_blocks_fail_closed` and `independent_player_caches`.
- A lava pool or adjacent campfires must not add lift beyond the configured maximum: Task 1 tests `multiple_sources_do_not_stack`.
- Landing, item change, wall impact, or closing must clear stale thermal influence: Task 1 tests `inactive_flight_clears_thermal_cache`, and Task 3 checks `endFlight` wiring.

---

## File structure

- Create `behavior_packs/windglider_bp/scripts/fire-updraft.js`: source classification, open-column search, field strength, and per-player cache transition. It imports no Minecraft module, so Node tests can use fake dimensions.
- Create `tests/fire-updraft.test.mjs`: block fixtures, geometry, occlusion, scan budget, cache, and multi-player cases.
- Modify `src/flight/GliderStateMachine.mjs` and `behavior_packs/windglider_bp/scripts/flight.js`: add the same updraft velocity formula to both intentionally separate flight implementations.
- Modify `tests/flight.test.mjs`: keep source/runtime parity and test vertical motion and route simulation.
- Modify `behavior_packs/windglider_bp/scripts/main.js`: pass the detected strength into the existing per-tick flight snapshot and clear the per-player cache on flight end.
- Modify `tests/pack-assets.test.mjs` and `tools/validate-pack.mjs`: require the new shipped script and check localized pack copy.
- Modify `README.md`, `docs/controls.md`, `AGENTS.md`, four pack `.lang` files, `package.json`, both pack manifests, and generated `dist/windgleiter.mcaddon`: document and version the released feature.

### Task 1: Detect a visible heat source and compute its field

**Files:** Create `behavior_packs/windglider_bp/scripts/fire-updraft.js`; create `tests/fire-updraft.test.mjs`.

**Interfaces:**
- Produces `THERMAL_CONFIG = { innerRadius: 1.5, outerRadius: 2.5, fullHeight: 5, maxHeight: 8, scanIntervalTicks: 3, maxHorizontalOffset: 2, maxDepthBlocks: 8 }`.
- Produces `isActiveHeatSource(block) -> boolean`, `updraftStrength(playerLocation, sourceLocation, config = THERMAL_CONFIG) -> number in [0,1]`, and `sampleFireUpdraft({ dimension, playerLocation, currentTick, cache, active }) -> { strength, cache }`.
- `cache` is `{ dimensionId, source?: { x, y, z }, nextScanTick }` or `undefined`; the caller stores the returned cache per player. `active: false` returns zero strength and an undefined cache without reading blocks.

- [ ] **Step 1: Write failing source and geometry tests.** In `tests/fire-updraft.test.mjs`, use fake `getBlock`/`heightRange` dimensions. Assert ordinary fire, lit campfire, and both lava IDs produce strength `1` at `(source.x + 0.5, source.y + 5, source.z + 0.5)`; extinguished campfire and soul variants produce `0`; `updraftStrength` is `0` at radius `2.5` and height `8`, and stays in `[0,1]` at every tested edge.
- [ ] **Step 2: Run** `node --test tests/fire-updraft.test.mjs`; expect FAIL because the module does not exist.
- [ ] **Step 3: Implement** the three Task 1 exports. Scan candidate columns from `floor(player.x/z) ± 2`, reject centers beyond radius `2.5`, and inspect at most eight blocks downward from `floor(player.y) - 1`. Stop each column at the first non-air block; accept it only if it is an allowed source. For lava require air immediately above. For campfire require `permutation.getState("extinguished") === false`. Strength is the product of linear horizontal and vertical fades; choose the strongest source. An obstructed upward headroom block at `floor(player.y) + 2` yields zero.
- [ ] **Step 4: Write failing cache/error tests.** Test `cached_source_extinguished_stops_lift`, `roof_and_headroom_block_lift`, `covered_lava_has_no_lift`, `unavailable_blocks_fail_closed`, `multiple_sources_do_not_stack`, `independent_player_caches`, and `inactive_flight_clears_thermal_cache`. Count fake `getBlock` calls: an empty search uses at most `201` reads, and a cache hit does not rescan all columns before tick `nextScanTick`. Assert a changed `dimension.id` invalidates the previous cache.
- [ ] **Step 5: Complete** `sampleFireUpdraft`: schedule scans `3` ticks apart; on intervening ticks recheck the cached source and every block in its air path. Catch `getBlock` errors and treat `undefined` or out-of-height reads as no source. Clearing/removing a source, adding a roof, or losing headroom returns zero on the next sample. Do not call `Dimension.getBlocks` (removed in API 2.0.0).
- [ ] **Step 6: Run** `node --test tests/fire-updraft.test.mjs`; expect all Task 1 tests PASS.
- [ ] **Step 7: Commit** only the new module and test: `git add behavior_packs/windglider_bp/scripts/fire-updraft.js tests/fire-updraft.test.mjs && git commit -m "feat: detect visible fire updrafts"`.

### Task 2: Apply bounded lift to the existing glide physics

**Files:** Modify `src/flight/GliderStateMachine.mjs`, `behavior_packs/windglider_bp/scripts/flight.js`, and `tests/flight.test.mjs`.

**Interfaces:**
- Consumes `snapshot.updraftStrength` from Task 1, a finite number in `[0,1]`; absent, non-finite, and out-of-range values are clamped to `[0,1]` with non-finite values treated as zero.
- Produces `GLIDER_CONFIG.updraftRiseSpeed = 2.5 / 20` in both flight implementations. For `GLIDING`, target Y velocity is `-descentSpeed + strength * (updraftRiseSpeed + descentSpeed)`; X/Z, heading, turn rates, and opening timing stay as before.

- [ ] **Step 1: Write failing motion and route tests.** For both implementations, assert strength `0` gives `-1.5 / 20`, `0.5` gives `+0.5 / 20`, and `1` gives `+2.5 / 20`; `NaN` gives normal descent and `2` never exceeds full rise. Assert unchanged X/Z speed and that `IDLE` and `OPENING` never receive lift. Simulate open flight above four heat sources centered `9` blocks apart at source Y `64`, starting at player Y `69`; use the strongest `updraftStrength` each tick. After traversing the route, assert the player has lost no more than one block of height, and never rises beyond source top plus `8` blocks.
- [ ] **Step 2: Run** `node --test tests/flight.test.mjs`; expect FAIL on the new lift assertions.
- [ ] **Step 3: Add** `updraftRiseSpeed` and the Y formula to `tickGlider(state, snapshot, input, config)` in the source file and `tickGlider(state, snapshot, input)` in the shipped runtime copy. Preserve their current exports and test parity.
- [ ] **Step 4: Run** `node --test tests/flight.test.mjs tests/fire-updraft.test.mjs`; expect PASS.
- [ ] **Step 5: Commit** the two flight files and flight test: `git add src/flight/GliderStateMachine.mjs behavior_packs/windglider_bp/scripts/flight.js tests/flight.test.mjs && git commit -m "feat: apply bounded updraft during gliding"`.

### Task 3: Wire the detector, document the feature, and package the release

**Files:** Modify `behavior_packs/windglider_bp/scripts/main.js`, `tests/pack-assets.test.mjs`, `tools/validate-pack.mjs`, `README.md`, `docs/controls.md`, `AGENTS.md`, `behavior_packs/windglider_bp/texts/{de_DE,en_US}.lang`, `resource_packs/windglider_rp/texts/{de_DE,en_US}.lang`, `package.json`, both pack `manifest.json` files, and `dist/windgleiter.mcaddon`.

**Interfaces:**
- Consumes `sampleFireUpdraft({ dimension: player.dimension, playerLocation: player.location, currentTick: system.currentTick, cache: record.thermalCache, active: record.state.state === GLIDER_STATES.GLIDING })` from Task 1.
- Produces `snapshot.updraftStrength` before calling `tickGlider`; stores the returned cache on the player record. `endFlight` clears that cache for all exit paths, including wall impact and item change.

- [ ] **Step 1: Write failing integration/pack tests.** In `tests/pack-assets.test.mjs`, assert the new script exists; `main.js` contains `sampleFireUpdraft`, passes `active: record.state.state === GLIDER_STATES.GLIDING`, and assigns `record.thermalCache = undefined` in `endFlight`; both English and German pack descriptions mention fire/campfire/lava lift; the BP and RP version assertions still agree.
- [ ] **Step 2: Run** `node --test tests/pack-assets.test.mjs`; expect FAIL on the new integration/pack assertions.
- [ ] **Step 3: In `main.js`,** initialize `record.thermalCache`, call the sampler before `tickGlider` with `active` true only for an already gliding player, assign `snapshot.updraftStrength`, and clear the cache in `endFlight`. Keep wall collision detection before `applyVelocity`, so wall closure still wins over lift. Add the script to `requiredFiles` in `tools/validate-pack.mjs`.
- [ ] **Step 4: Update** both pack descriptions and `README.md`/`docs/controls.md` in German and English where applicable. Describe source types, the open-air requirement, route spacing as an initial value, and the fact that lift works only with the open glider. Add the module and tuning notes to `AGENTS.md`.
- [ ] **Step 5: Bump** `package.json`, both pack headers/modules/cross-dependencies, and the install-guide version from `1.0.26` to `1.0.27` (or the next patch if HEAD advanced). Preserve UUIDs, item ID, and `@minecraft/server` `2.0.0`.
- [ ] **Step 6: Run** `npm run build`; expect all Node tests and validation PASS. Inspect `dist/windgleiter.mcaddon`: it must contain `windglider_bp.mcpack` and `windglider_rp.mcpack`, each with a root `manifest.json` at the release version. Run `git diff --check`; expect no output.
- [ ] **Step 7: Commit** the reviewed integration, docs, version, tests, and rebuilt archive with `git add` on explicit changed paths, then `git commit -m "feat: package fire updrafts (1.0.27)"`. Push the tested build to `main` for the user's established Git-based install workflow; describe it as awaiting in-game acceptance.
- [ ] **Step 8: Test in a local Bedrock world copy.** Fly through four lit campfires about `9` blocks apart; verify visible upward movement without upward input, no boost from extinguished campfires, covered lava, soul fire, or a roof; check removal of a source, low ceiling, wall impact, landing, and two simultaneous players. Record the observed speed/spacing and adjust only the central thermal constants if needed. Then repeat basic visuals and flight in a separate PC/PS5 Test Realm. Mark these as manual results, separate from the automated tests; do not claim Realm compatibility from the archive alone.

## Self-review

- Spec coverage: each source type, visibility, lift profile, route, timing, language, API floor, and manual PC/Realm check maps to a task above.
- Step scan: each test, implementation, verification, and commit is separately checkable; no unspecified API or tuning value remains.
- Type consistency: Task 1 returns numeric `strength`, Task 3 assigns it to `snapshot.updraftStrength`, and Task 2 consumes that property.
- Review Focus: all five named failure classes have corresponding tests in Tasks 1–3.
- Proportion: the plan fixes interfaces and acceptance values; it leaves routine JavaScript bodies to the implementer.

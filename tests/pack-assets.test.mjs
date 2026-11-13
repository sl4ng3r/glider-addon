import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const readText = (path) => readFileSync(join(root, path), "utf8");

test("the item uses the namespaced icon key and localized item key", () => {
  const item = readJson("behavior_packs/windglider_bp/items/glider.json")["minecraft:item"];
  const itemTexture = readJson("resource_packs/windglider_rp/textures/item_texture.json");

  assert.equal(item.components["minecraft:display_name"].value, "item.glider:glider");
  assert.equal(item.components["minecraft:icon"].textures?.default, "glider:glider");
  assert.equal(item.components["minecraft:icon"].texture, undefined);
  assert.deepEqual(itemTexture.texture_data["glider:glider"].textures, "textures/items/wind_glider");
});

test("the folded hand model hides through the player pose without a hotbar cooldown", () => {
  const item = readJson("behavior_packs/windglider_bp/items/glider.json")["minecraft:item"];
  const controller = readJson("resource_packs/windglider_rp/render_controllers/wind_glider.render_controllers.json")
    .render_controllers["controller.render.wind_glider_item"];
  const pose = readJson("resource_packs/windglider_rp/animations/wind_glider.animation.json")
    .animations["animation.wind_glider.player_glide"];
  assert.equal(item.components["minecraft:cooldown"], undefined);
  assert.equal(controller.part_visibility, undefined);
  assert.deepEqual(pose.bones.rightitem.scale, [0, 0, 0]);
});

test("English and German resource translations name the item", () => {
  assert.match(readText("resource_packs/windglider_rp/texts/en_US.lang"), /^item\.glider:glider=Wind Glider$/m);
  assert.match(readText("resource_packs/windglider_rp/texts/de_DE.lang"), /^item\.glider:glider=Windgleiter$/m);
});

test("controls appear in localized pack descriptions instead of the action bar", () => {
  const script = readText("behavior_packs/windglider_bp/scripts/main.js");
  assert.doesNotMatch(script, /setActionBar|showTranslation|windglider\.hint|windglider\.opening/);
  assert.match(script, /decideOpeningPress/);
  for (const pack of ["behavior_packs/windglider_bp", "resource_packs/windglider_rp"]) {
    const manifest = readJson(`${pack}/manifest.json`);
    assert.equal(manifest.header.name, "pack.name");
    assert.equal(manifest.header.description, "pack.description");
    const english = readText(`${pack}/texts/en_US.lang`);
    const german = readText(`${pack}/texts/de_DE.lang`);
    assert.match(english, /^pack\.description=.*Jump.*open.*Jump.*close/m);
    assert.match(german, /^pack\.description=.*Springen.*öffnen.*Springen.*schließen/mi);
    assert.match(english, /^pack\.description=.*0\.4s/m);
    assert.match(german, /^pack\.description=.*0,4 s/m);
    assert.match(english, /^pack\.description=.*0\.8s/m);
    assert.match(german, /^pack\.description=.*0,8 s/m);
    assert.doesNotMatch(english, /^windglider\.(hint|opening)=/m);
    assert.doesNotMatch(german, /^windglider\.(hint|opening)=/m);
  }
});

test("creative category does not use an invalid unnamespaced group", () => {
  const menu = readJson("behavior_packs/windglider_bp/items/glider.json")["minecraft:item"].description.menu_category;
  assert.equal(menu.category, "items");
  assert.ok(menu.group === undefined || /^[^:]+:.+$/.test(menu.group));
});

test("the display entity rejects damage using the current sensor schema", () => {
  const entity = readJson("behavior_packs/windglider_bp/entities/glider_display.entity.json")["minecraft:entity"];
  assert.ok(entity.components["minecraft:damage_sensor"].triggers.some((trigger) => trigger.cause === "all" && trigger.deals_damage === "no"));
});

test("the display can be spawned by the Script API without adding a creative spawn egg", () => {
  const description = readJson("behavior_packs/windglider_bp/entities/glider_display.entity.json")["minecraft:entity"].description;
  assert.equal(description.is_summonable, true);
  assert.equal(description.is_spawnable, false);
});

test("the crafting recipe is available after collecting leather", () => {
  const recipe = readJson("behavior_packs/windglider_bp/recipes/wind_glider.json")["minecraft:recipe_shaped"];
  assert.ok(recipe.unlock?.some((condition) => condition.item === "minecraft:leather"));
});

test("the folded model binds to the held item slot and uses a matching texture size", () => {
  const attachable = readJson("resource_packs/windglider_rp/attachables/glider.player.json")["minecraft:attachable"].description;
  const geometry = readJson("resource_packs/windglider_rp/models/entity/wind_glider.geo.json")["minecraft:geometry"]
    .find((model) => model.description.identifier === attachable.geometry.default);
  const bone = geometry.bones.find((entry) => entry.name === "root");
  assert.equal(bone.binding, "q.item_slot_to_bone_name(context.item_slot)");
  const png = readFileSync(join(root, "resource_packs/windglider_rp", `${attachable.textures.default}.png`));
  assert.equal(png.readUInt32BE(16), geometry.description.texture_width);
  assert.equal(png.readUInt32BE(20), geometry.description.texture_height);
});

test("the held model sits near the player's hand instead of the feet", () => {
  const model = readJson("resource_packs/windglider_rp/models/entity/wind_glider.geo.json")["minecraft:geometry"]
    .find(({ description }) => description.identifier === "geometry.wind_glider.folded");
  const attachable = readJson("resource_packs/windglider_rp/attachables/glider.player.json")["minecraft:attachable"].description;
  const animations = readJson("resource_packs/windglider_rp/animations/wind_glider.animation.json").animations;
  assert.equal(model.bones[0].binding, "q.item_slot_to_bone_name(context.item_slot)");
  assert.ok(model.bones[0].pivot[1] >= 15);
  assert.ok(model.bones[0].cubes.every(({ origin }) => origin[1] >= 10));
  assert.ok(Math.max(...model.bones[0].cubes.map(({ size }) => size[0])) <= 4, "the folded item stays within the hand");
  const [foldedCloth, crossbar, grip] = model.bones[0].cubes;
  for (const part of [foldedCloth, crossbar, grip]) {
    const centerX = part.origin[0] + part.size[0] / 2;
    assert.ok(Math.abs(centerX - model.bones[0].pivot[0]) <= 0.5, "folded parts should line up with the held-item anchor");
  }
  const gripCenterY = grip.origin[1] + grip.size[1] / 2;
  const gripCenterZ = grip.origin[2] + grip.size[2] / 2;
  assert.ok(Math.abs(gripCenterY - model.bones[0].pivot[1]) <= 0.5, "the grip must meet the hand anchor vertically");
  assert.ok(gripCenterZ - model.bones[0].pivot[2] >= 4, "the grip must sit farther back toward the hand");
  assert.ok(foldedCloth.origin[1] > grip.origin[1], "the folded canopy sits above the hand-held grip");
  assert.ok(!attachable.scripts.animate.some((entry) => Object.hasOwn(entry, "hold_third_person")));
  assert.equal(animations["animation.wind_glider.hold_third_person"], undefined);
});

test("the open sail has a visible span and the model texture is a UV atlas", () => {
  const models = readJson("resource_packs/windglider_rp/models/entity/wind_glider.geo.json")["minecraft:geometry"];
  const open = models.find(({ description }) => description.identifier === "geometry.wind_glider.open");
  const canopy = open.bones.find(({ name }) => name === "canopy");
  assert.ok(canopy.cubes.length >= 5, "separate fabric panels form a curved sail");
  const span = Math.max(...canopy.cubes.map(({ origin, size }) => origin[0] + size[0]))
    - Math.min(...canopy.cubes.map(({ origin }) => origin[0]));
  assert.ok(span >= 48);
  assert.ok(new Set(canopy.cubes.map(({ origin }) => origin[1])).size >= 3, "the sail has a raised center and lower tips");
  const handles = open.bones.find(({ name }) => name === "handles");
  assert.ok(handles.cubes.every(({ origin }) => origin[1] >= 6), "the grips are close to raised hands");
  const texturePath = join(root, "resource_packs/windglider_rp/textures/entity/wind_glider.png");
  const png = readFileSync(texturePath);
  assert.equal(png.readUInt32BE(16), open.description.texture_width);
  assert.equal(png.readUInt32BE(20), open.description.texture_height);
  const imageData = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") imageData.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const scanlines = inflateSync(Buffer.concat(imageData));
  const pixelAt = (x, y) => {
    assert.equal(scanlines[y * 257], 0, "the generated UV atlas uses unfiltered RGBA rows");
    return [...scanlines.subarray(y * 257 + 1 + x * 4, y * 257 + 5 + x * 4)];
  };
  const sail = pixelAt(7, 7);
  const motif = pixelAt(19, 7);
  const undersideMotif = pixelAt(19, 27);
  const wood = pixelAt(50, 2);
  assert.ok(sail[0] > sail[2] && sail[1] > sail[2], "sail is warm cloth, not sky blue");
  assert.ok(motif[1] > motif[0] && motif[1] > motif[2], "sail carries a green motif");
  assert.ok(undersideMotif[1] > undersideMotif[0] && undersideMotif[1] > undersideMotif[2], "the motif is visible from below");
  assert.ok(wood[0] > wood[1] && wood[1] > wood[2], "frame uses brown wood");
  const source = readText("tools/generate-model-texture.mjs");
  assert.match(source, /sail|cloth|wood/i);
  assert.doesNotMatch(source, /title|landscape|sky/i);
});

test("gliding pose is finite and resets the player limbs", () => {
  const animations = readJson("resource_packs/windglider_rp/animations/wind_glider.animation.json").animations;
  const pose = animations["animation.wind_glider.player_glide"];
  assert.equal(pose.override_previous_animation, true);
  assert.equal(pose.loop, false);
  assert.ok(pose.animation_length > 0 && pose.animation_length <= 0.5);
  for (const bone of ["leftarm", "rightarm", "leftleg", "rightleg"]) assert.ok(pose.bones[bone].rotation);
});

test("behavior pack pins the matching resource pack version", () => {
  const behavior = readJson("behavior_packs/windglider_bp/manifest.json");
  const resources = readJson("resource_packs/windglider_rp/manifest.json");
  const dependency = behavior.dependencies.find(({ uuid }) => uuid === resources.header.uuid);

  assert.deepEqual(dependency?.version, resources.header.version);
});

test("both packs are cooperative and share the same release", () => {
  const behavior = readJson("behavior_packs/windglider_bp/manifest.json");
  const resources = readJson("resource_packs/windglider_rp/manifest.json");
  const behaviorDependency = resources.dependencies?.find(({ uuid }) => uuid === behavior.header.uuid);

  assert.deepEqual(behavior.header.version, resources.header.version);
  assert.deepEqual(behaviorDependency?.version, behavior.header.version);
  assert.equal(resources.header.pack_scope, "world");
});

test("package, pack and module versions stay in sync", () => {
  const version = readJson("package.json").version;
  for (const path of ["behavior_packs/windglider_bp/manifest.json", "resource_packs/windglider_rp/manifest.json"]) {
    const pack = readJson(path);
    assert.equal(pack.header.version.join("."), version);
    for (const module of pack.modules) assert.equal(module.version.join("."), version);
  }
});

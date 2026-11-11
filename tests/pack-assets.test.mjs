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

test("English and German resource translations name the item", () => {
  assert.match(readText("resource_packs/windglider_rp/texts/en_US.lang"), /^item\.glider:glider=Wind Glider$/m);
  assert.match(readText("resource_packs/windglider_rp/texts/de_DE.lang"), /^item\.glider:glider=Windgleiter$/m);
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
  assert.ok(Math.max(...model.bones[0].cubes.map(({ size }) => size[0])) <= 8, "the folded item does not cover the player's shoulders");
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

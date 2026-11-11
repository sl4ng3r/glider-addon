import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

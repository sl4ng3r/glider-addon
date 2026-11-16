import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GUIDE_PAGE_KEYS, guideDestination } from "../behavior_packs/windglider_bp/scripts/guide-book.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const json = (path) => JSON.parse(read(path));

test("the independent guidebook is craftable from a book and quill plus paper", () => {
  const item = json("behavior_packs/windglider_bp/items/guide_book.json")["minecraft:item"];
  const recipe = json("behavior_packs/windglider_bp/recipes/guide_book.json")["minecraft:recipe_shapeless"];
  const atlas = json("resource_packs/windglider_rp/textures/item_texture.json");

  assert.equal(item.description.identifier, "glider:guide_book");
  assert.equal(item.components["minecraft:display_name"].value, "item.glider:guide_book");
  assert.equal(item.components["minecraft:icon"].textures.default, "glider:guide_book");
  assert.ok(item.components["glider:read_guide"] !== undefined);
  assert.equal(item.components["minecraft:interact_button"], true);
  assert.equal(atlas.texture_data["glider:guide_book"].textures, "textures/items/book_written");
  assert.equal(recipe.result.item, "glider:guide_book");
  assert.deepEqual(recipe.ingredients.map(({ item: id }) => id).sort(), ["minecraft:paper", "minecraft:writable_book"]);
  assert.ok(recipe.tags.includes("crafting_table"));
  assert.ok(recipe.ingredients.every(({ item: id }) => id !== "glider:glider"));
});

test("all book pages and controls have English and German text", () => {
  assert.equal(GUIDE_PAGE_KEYS.length, 3);
  for (const locale of ["en_US", "de_DE"]) {
    const entries = new Map(read(`resource_packs/windglider_rp/texts/${locale}.lang`).trim().split("\n").map((line) => line.split(/=(.*)/s).slice(0, 2)));
    for (const key of ["item.glider:guide_book", "windglider.guide.title", "windglider.guide.previous", "windglider.guide.next", "windglider.guide.close", ...GUIDE_PAGE_KEYS]) {
      assert.ok(entries.get(key), `${locale} is missing ${key}`);
    }
    for (const key of GUIDE_PAGE_KEYS) assert.ok(entries.get(key).length <= 240, `${locale} page ${key} is too long`);
  }
});

test("book navigation stays within its three pages and closes on request", () => {
  assert.equal(guideDestination(0, 0), 0);
  assert.equal(guideDestination(0, 1), 1);
  assert.equal(guideDestination(1, 1), 2);
  assert.equal(guideDestination(2, 1), 2);
  assert.equal(guideDestination(2, 0), 1);
  assert.equal(guideDestination(1, 2), null);
  assert.equal(guideDestination(1, undefined), null);
});

test("the stable UI module is registered only for the guidebook", () => {
  const behaviorManifest = json("behavior_packs/windglider_bp/manifest.json");
  assert.ok(behaviorManifest.dependencies.some(({ module_name, version }) => module_name === "@minecraft/server-ui" && version === "2.0.0"));
  const main = read("behavior_packs/windglider_bp/scripts/main.js");
  const ui = read("behavior_packs/windglider_bp/scripts/guide-book-ui.js");
  assert.match(main, /registerCustomComponent\("glider:read_guide"/);
  assert.match(main, /showGuideBook\(source\)/);
  assert.match(ui, /new ActionFormData\(\)/);
  assert.match(ui, /body\(\{ translate: GUIDE_PAGE_KEYS\[pageIndex\] \}\)/);
});

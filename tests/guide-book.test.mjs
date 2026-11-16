import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GUIDE_SECTION_KEYS, guideBody } from "../behavior_packs/windglider_bp/scripts/guide-book.js";

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

test("the one-page guide has two short sections in English and German", () => {
  assert.equal(GUIDE_SECTION_KEYS.length, 2);
  for (const locale of ["en_US", "de_DE"]) {
    const entries = new Map(read(`resource_packs/windglider_rp/texts/${locale}.lang`).trim().split("\n").map((line) => line.split(/=(.*)/s).slice(0, 2)));
    for (const key of ["item.glider:guide_book", "windglider.guide.title", "windglider.guide.close", ...GUIDE_SECTION_KEYS.flat()]) {
      assert.ok(entries.get(key), `${locale} is missing ${key}`);
    }
    for (const [, bodyKey] of GUIDE_SECTION_KEYS) {
      assert.ok(entries.get(bodyKey).length <= 160, `${locale} section ${bodyKey} is too long`);
      assert.doesNotMatch(entries.get(bodyKey), /0[,.]\d|\b(?:ticks?|seconds?|Sekunden?|Lagerfeuer|campfires?|Lava|lava)\b/i);
    }
  }
});

test("guide body renders both sections on one page", () => {
  assert.deepEqual(guideBody(), { rawtext: [
    { translate: "windglider.guide.gliding.title" },
    { text: "\n" },
    { translate: "windglider.guide.gliding.body" },
    { text: "\n\n" },
    { translate: "windglider.guide.updraft.title" },
    { text: "\n" },
    { translate: "windglider.guide.updraft.body" },
  ] });
});

test("the stable UI module is registered only for the guidebook", () => {
  const behaviorManifest = json("behavior_packs/windglider_bp/manifest.json");
  assert.ok(behaviorManifest.dependencies.some(({ module_name, version }) => module_name === "@minecraft/server-ui" && version === "2.0.0"));
  const main = read("behavior_packs/windglider_bp/scripts/main.js");
  const ui = read("behavior_packs/windglider_bp/scripts/guide-book-ui.js");
  assert.match(main, /registerCustomComponent\("glider:read_guide"/);
  assert.match(main, /showGuideBook\(source\)/);
  assert.match(ui, /new ActionFormData\(\)/);
  assert.match(ui, /\.body\(guideBody\(\)\)/);
  assert.doesNotMatch(ui, /windglider\.guide\.previous|windglider\.guide\.next/);
});

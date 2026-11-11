import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const behavior = join(root, "behavior_packs", "windglider_bp");
const resources = join(root, "resource_packs", "windglider_rp");
const errors = [];

function required(path) {
  if (!existsSync(path)) errors.push(`Fehlende Ressource: ${relative(root, path)}`);
}

function json(path) {
  required(path);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`Ungültiges JSON ${relative(root, path)}: ${error.message}`);
    return undefined;
  }
}

function pngSize(path) {
  required(path);
  if (!existsSync(path)) return undefined;
  const data = readFileSync(path);
  if (data.readUInt32BE(0) !== 0x89504e47) {
    errors.push(`Keine PNG-Datei: ${relative(root, path)}`);
    return undefined;
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const behaviorManifest = json(join(behavior, "manifest.json"));
const resourceManifest = json(join(resources, "manifest.json"));
if (behaviorManifest?.header?.uuid !== "1a6c3b1e-8f2f-4eb6-8c27-4a5c2c4f6a11") errors.push("Behavior-Pack-UUID ist nicht stabil oder unerwartet.");
if (resourceManifest?.header?.uuid !== "2f5fca49-f610-4b35-9fd1-2c7764b82c22") errors.push("Resource-Pack-UUID ist nicht stabil oder unerwartet.");
const resourceDependency = behaviorManifest?.dependencies?.find((dependency) => dependency.uuid === resourceManifest?.header?.uuid);
if (!resourceDependency) {
  errors.push("Behavior Pack referenziert das Resource Pack nicht.");
} else if (resourceDependency.version?.join(".") !== resourceManifest?.header?.version?.join(".")) {
  errors.push("Behavior Pack und Resource Pack haben unterschiedliche Versionen.");
}
if (!behaviorManifest?.dependencies?.some((dependency) => dependency.module_name === "@minecraft/server" && dependency.version === "2.0.0")) errors.push("Stabile @minecraft/server-2.0.0-Abhängigkeit fehlt.");

for (const pack of [behavior, resources]) {
  const languages = json(join(pack, "texts", "languages.json"));
  if (!languages?.includes("en_US") || !languages?.includes("de_DE")) errors.push(`${relative(root, pack)} muss en_US und de_DE aktivieren.`);
  for (const locale of ["en_US", "de_DE"]) {
    const textPath = join(pack, "texts", `${locale}.lang`);
    required(textPath);
    if (existsSync(textPath)) {
      const text = readFileSync(textPath, "utf8");
      for (const key of ["windglider.hint", "windglider.opening"]) {
        if (!text.includes(`${key}=`)) errors.push(`${relative(root, textPath)} enthält ${key} nicht.`);
      }
    }
  }
}

const item = json(join(behavior, "items", "glider.json"));
const recipe = json(join(behavior, "recipes", "wind_glider.json"));
if (item?.["minecraft:item"]?.description?.identifier !== "glider:glider") errors.push("Item-ID glider:glider fehlt.");
if (item?.["minecraft:item"]?.components?.["minecraft:display_name"]?.value !== "item.glider:glider") errors.push("Item-Übersetzungsschlüssel item.glider:glider fehlt.");
if (item?.["minecraft:item"]?.components?.["minecraft:icon"]?.texture !== "glider:glider") errors.push("Item-Icon-Key glider:glider fehlt.");
if (recipe?.["minecraft:recipe_shaped"]?.result?.item !== "glider:glider") errors.push("Rezept erzeugt nicht glider:glider.");
if (recipe?.["minecraft:recipe_shaped"]?.pattern?.join("|") !== "LLL|SFS| S ") errors.push("Rezeptmuster entspricht nicht dem Plan.");

const itemTexture = json(join(resources, "textures", "item_texture.json"));
if (itemTexture?.texture_data?.["glider:glider"]?.textures !== "textures/items/wind_glider") errors.push("Item-Textur glider:glider fehlt.");

const requiredFiles = [
  join(behavior, "scripts", "main.js"),
  join(behavior, "scripts", "flight.js"),
  join(behavior, "entities", "glider_display.entity.json"),
  join(resources, "textures", "item_texture.json"),
  join(resources, "textures", "items", "wind_glider.png"),
  join(resources, "textures", "entity", "wind_glider.png"),
  join(resources, "attachables", "glider.player.json"),
  join(resources, "entity", "glider.display.json"),
  join(resources, "models", "entity", "wind_glider.geo.json"),
  join(resources, "animations", "wind_glider.animation.json"),
  join(resources, "render_controllers", "wind_glider.render_controllers.json"),
  join(resources, "sounds", "sound_definitions.json"),
  join(resources, "sounds", "wind_glider_open.wav"),
  join(resources, "sounds", "wind_glider_close.wav"),
  join(resources, "sounds", "wind_glider_wind.wav"),
  join(resources, "texts", "languages.json"),
];
requiredFiles.forEach(required);
for (const path of [...walk(behavior), ...walk(resources)]) {
  if (!path.endsWith(".json")) continue;
  json(path);
}

for (const [path, expected] of [
  [join(behavior, "pack_icon.png"), 256],
  [join(resources, "pack_icon.png"), 256],
  [join(resources, "textures", "items", "wind_glider.png"), 32],
]) {
  const size = pngSize(path);
  if (size && (size.width !== expected || size.height !== expected)) errors.push(`${relative(root, path)} muss ${expected}x${expected} Pixel groß sein, ist ${size.width}x${size.height}.`);
}
const titleSize = pngSize(join(root, "docs", "assets", "windglider-title.png"));
if (titleSize && (titleSize.width !== 1920 || titleSize.height !== 1080)) errors.push("Titelbild muss 1920x1080 Pixel groß sein.");

const main = readFileSync(join(behavior, "scripts", "main.js"), "utf8");
if (main.includes("../../../src/")) errors.push("Das Behavior Pack darf keine Quelle außerhalb des Packs importieren.");
if (!main.includes("playerButtonInput")) errors.push("Sprungtasten-Ereignis fehlt.");
if (!main.includes("windglider_active")) errors.push("Aktive-Gleiter-Markierung fehlt.");

if (errors.length) {
  console.error(errors.map((error) => `✖ ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("✔ Pack-Struktur, JSON, Übersetzungen, PNG-Größen und Ressourcen sind gültig.");
}

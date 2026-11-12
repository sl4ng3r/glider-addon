import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAddon } from "../tools/build-addon.mjs";

test("the mcaddon contains two importable mcpacks with root manifests", () => {
  const root = mkdtempSync(join(tmpdir(), "windgleiter-package-test-"));
  try {
    for (const [kind, name] of [["behavior_packs", "windglider_bp"], ["resource_packs", "windglider_rp"]]) {
      const folder = join(root, kind, name);
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, "manifest.json"), JSON.stringify({ header: { version: [1, 0, 24] } }));
    }
    const output = join(root, "dist", "windgleiter.mcaddon");
    buildAddon({ root, output });

    const entries = execFileSync("unzip", ["-Z1", output], { encoding: "utf8" }).trim().split("\n");
    assert.deepEqual(entries.sort(), ["windglider_bp.mcpack", "windglider_rp.mcpack"]);
    for (const name of entries) {
      const pack = execFileSync("unzip", ["-p", output, name]);
      const packPath = join(root, name);
      writeFileSync(packPath, pack);
      const packEntries = execFileSync("unzip", ["-Z1", packPath], { encoding: "utf8" }).trim().split("\n");
      assert.ok(packEntries.includes("manifest.json"), `${name} needs a manifest at its root`);
      const manifest = JSON.parse(execFileSync("unzip", ["-p", packPath, "manifest.json"], { encoding: "utf8" }));
      assert.deepEqual(manifest.header.version, [1, 0, 24]);
      assert.ok(readFileSync(packPath).length > 0);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

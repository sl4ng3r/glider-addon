import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export function buildAddon({ root = projectRoot, output = join(root, "dist", "windgleiter.mcaddon") } = {}) {
  const staging = mkdtempSync(join(tmpdir(), "windgleiter-build-"));
  try {
    for (const [kind, name] of [["behavior_packs", "windglider_bp"], ["resource_packs", "windglider_rp"]]) {
      const packDir = join(staging, name);
      cpSync(join(root, kind, name), packDir, { recursive: true });
      execFileSync("zip", ["-qr", join(staging, `${name}.mcpack`), ...readdirSync(packDir)], { cwd: packDir });
    }
    const addon = join(staging, "windgleiter.mcaddon");
    execFileSync("zip", ["-q", addon, "windglider_bp.mcpack", "windglider_rp.mcpack"], { cwd: staging });
    mkdirSync(dirname(output), { recursive: true });
    copyFileSync(addon, output);
    return output;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`✔ ${buildAddon()}`);
}

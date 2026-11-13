import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const archiveTime = new Date("2000-01-01T00:00:00Z");
const zipEnvironment = { ...process.env, TZ: "UTC" };

function normalizeTimes(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) normalizeTimes(child);
    else utimesSync(child, archiveTime, archiveTime);
  }
  utimesSync(path, archiveTime, archiveTime);
}

export function buildAddon({ root = projectRoot, output = join(root, "dist", "windgleiter.mcaddon") } = {}) {
  const staging = mkdtempSync(join(tmpdir(), "windgleiter-build-"));
  try {
    for (const [kind, name] of [["behavior_packs", "windglider_bp"], ["resource_packs", "windglider_rp"]]) {
      const packDir = join(staging, name);
      cpSync(join(root, kind, name), packDir, { recursive: true });
      normalizeTimes(packDir);
      execFileSync("zip", ["-qrX", join(staging, `${name}.mcpack`), ...readdirSync(packDir)], { cwd: packDir, env: zipEnvironment });
      utimesSync(join(staging, `${name}.mcpack`), archiveTime, archiveTime);
    }
    const addon = join(staging, "windgleiter.mcaddon");
    execFileSync("zip", ["-qX", addon, "windglider_bp.mcpack", "windglider_rp.mcpack"], { cwd: staging, env: zipEnvironment });
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

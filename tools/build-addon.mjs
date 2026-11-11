import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const staging = join(root, ".build", "windglider");
const dist = join(root, "dist");
const output = join(dist, "windgleiter.mcaddon");

rmSync(join(root, ".build"), { recursive: true, force: true });
rmSync(output, { force: true });
mkdirSync(join(staging, "behavior_packs"), { recursive: true });
mkdirSync(join(staging, "resource_packs"), { recursive: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "behavior_packs", "windglider_bp"), join(staging, "behavior_packs", "windglider_bp"), { recursive: true });
cpSync(join(root, "resource_packs", "windglider_rp"), join(staging, "resource_packs", "windglider_rp"), { recursive: true });
execFileSync("zip", ["-qr", output, "behavior_packs", "resource_packs"], { cwd: staging, stdio: "inherit" });
console.log(`✔ ${output}`);

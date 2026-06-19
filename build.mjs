import { copyFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";

const SRC = "src";
const DIST = "dist";

async function copyDir(src, dest) {
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(d, { recursive: true });
      await copyDir(s, d);
    } else if (/\.(js|mjs|cjs|json)$/.test(entry.name)) {
      copyFileSync(s, d);
    }
  }
}

async function main() {
  console.log("Building...");
  if (existsSync(DIST)) rmSync(DIST, { recursive: true });
  mkdirSync(DIST, { recursive: true });
  await copyDir(SRC, DIST);
  copyFileSync("package.json", join(DIST, "package.json"));
  if (existsSync("pnpm-lock.yaml")) copyFileSync("pnpm-lock.yaml", join(DIST, "pnpm-lock.yaml"));
  console.log("Build OK -> dist/");
}

main().catch((err) => { console.error("Build failed:", err); process.exit(1); });

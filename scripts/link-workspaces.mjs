/**
 * Windows / non-NTFS fallback: copy (or junction) workspace packages into
 * consuming node_modules trees when pnpm symlinks fail.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const links = [
  { from: "packages/shared", to: "apps/api/node_modules/@tron-gas-sponsor/shared" },
  { from: "packages/config", to: "apps/api/node_modules/@tron-gas-sponsor/config" },
  { from: "packages/database", to: "apps/api/node_modules/@tron-gas-sponsor/database" },
  { from: "packages/shared", to: "apps/web/node_modules/@tron-gas-sponsor/shared" },
  { from: "packages/shared", to: "node_modules/@tron-gas-sponsor/shared" },
  { from: "packages/config", to: "node_modules/@tron-gas-sponsor/config" },
  { from: "packages/database", to: "node_modules/@tron-gas-sponsor/database" },
];

for (const { from, to } of links) {
  const fromPath = join(root, from);
  const toPath = join(root, to);
  if (!existsSync(fromPath)) {
    console.warn(`[link-workspaces] skip missing ${from}`);
    continue;
  }
  mkdirSync(dirname(toPath), { recursive: true });
  if (existsSync(toPath)) {
    rmSync(toPath, { recursive: true, force: true });
  }

  let linked = false;
  try {
    symlinkSync(fromPath, toPath, "junction");
    linked = true;
    console.log(`[link-workspaces] junction ${to}`);
  } catch {
    linked = false;
  }

  if (!linked) {
    cpSync(fromPath, toPath, { recursive: true, dereference: true });
    const nestedNm = join(toPath, "node_modules");
    if (existsSync(nestedNm)) {
      rmSync(nestedNm, { recursive: true, force: true });
    }
    console.log(`[link-workspaces] copied ${to}`);
  }
}

mkdirSync(join(root, "node_modules/@tron-gas-sponsor"), { recursive: true });
writeFileSync(
  join(root, "node_modules/@tron-gas-sponsor/.link-stamp"),
  new Date().toISOString(),
);
console.log("[link-workspaces] done");

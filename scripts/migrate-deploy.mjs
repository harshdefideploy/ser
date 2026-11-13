#!/usr/bin/env node
/**
 * Production migrate entrypoint with a clear failure if DATABASE_URL is missing.
 * Used by Voroa / Compose pre-deploy and `npm run start:release`.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(`
FATAL: DATABASE_URL is not set.

Prisma cannot run migrations without it. On Voroa:
  1. Open tron-db → Connect → Connect to a service → choose "monitor" → Connect
     (preferred — injects a linked DATABASE_URL), OR
  2. Get connection details → Copy new URL → monitor → Environment →
     edit DATABASE_URL → paste → Save changes → Manual Deploy

Do not leave Trusted sources with example IPs if they block the app.
Leave Trusted sources empty to allow all, or use workspace-internal access.
`);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databasePkg = path.join(root, "packages", "database");

const result = spawnSync(
  "npm",
  ["run", "migrate:deploy", "--workspace=@tron-gas-sponsor/database"],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
    windowsHide: true,
  },
);

if ((result.status ?? 1) !== 0) {
  // Fallback: run prisma from the database package cwd (avoids path-with-spaces issues)
  const fallback = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: databasePkg,
    stdio: "inherit",
    shell: true,
    env: process.env,
    windowsHide: true,
  });
  process.exit(fallback.status ?? 1);
}

process.exit(0);

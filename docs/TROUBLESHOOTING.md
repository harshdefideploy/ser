# Troubleshooting

## API won't start — invalid env

Ensure `.env` has:

- `DATABASE_URL`
- `JWT_SECRET` (≥32 chars)
- `COOKIE_SECRET` (≥32 chars)
- `ENCRYPTION_KEY` (exactly 64 hex chars)

## Database connection refused

```bash
docker compose up -d postgres
docker compose ps
```

Confirm `DATABASE_URL` host (`localhost` locally, `postgres` in Compose).

## Voroa deploy aborted — `DATABASE_URL` not found

Pre-deploy runs `npm run db:migrate`. Prisma needs `DATABASE_URL` in the **monitor** service environment.

Fix:

1. `tron-db` → Connect → **Connect to a service** → `monitor` → Connect, **or**
2. Get connection details → Copy new URL → monitor Environment → set `DATABASE_URL` → Save → Manual Deploy

## Voroa `/health` Prisma P1000 (auth failed)

Password was rotated (Get connection details / Connect-to-service) but `DATABASE_URL` still has the old password. Copy the **new** URL into Environment and redeploy.

## pnpm “Ignored build scripts” (prisma / esbuild)

`pnpm-workspace.yaml` lists them under `allowBuilds` / `onlyBuiltDependencies`. Commit and redeploy so install downloads Prisma engines.

## Login fails after seed

Re-run:

```bash
pnpm db:seed
```

Password is taken from `ADMIN_PASSWORD` in `.env` **only when the admin user is first created** (upsert does not overwrite password).

## Web can't reach API

Set `NEXT_PUBLIC_API_URL=http://localhost:4000` and ensure CORS `WEB_URL` matches the browser origin.

## Phase 1 empty tables

Expected. Monitors start in Phase 2+.

## Windows: `EISDIR` / symlink errors during install

This Desktop path may not support NTFS junctions/symlinks. Use:

```bash
npm install
npm run link:workspaces
```

or clone to `C:\dev\tron-gas-sponsor` and install there.

## `@tron-gas-sponsor/*` module not found after deleting dist

Stale `*.tsbuildinfo` can leave empty `dist` folders. Fix:

```bash
Remove-Item -Recurse -Force packages/*/dist, packages/*/tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build --workspace=@tron-gas-sponsor/shared
npm run build --workspace=@tron-gas-sponsor/config
npm run build --workspace=@tron-gas-sponsor/database
npm run link:workspaces
```

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

# Deployment

## Local

```bash
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

Host Postgres port defaults to `55432`. On Windows, if workspace linking fails, clone to an NTFS path under `C:\` or use Compose.

## Docker Compose

```bash
cp .env.example .env
# set secrets
docker compose up -d --build
```

Services: `web`, `api`, `worker`, `postgres`.

## Voroa (monitor + tron-db)

### Service commands (API-only service)

| Setting | Recommended value |
|---|---|
| Node | **20** or **22** |
| Install | platform default (`pnpm install --frozen-lockfile`) |
| Build | `npm run build:api` |
| Pre-deploy | `npm run db:migrate` |
| Start | `npm run start:api` |

If pre-deploy keeps failing because env is not injected there, clear Pre-deploy and use:

| Start | `npm run start:release` |

(`start:release` = migrate then start API.)

### Required env on `monitor`

Must be present (runtime; also needed for migrate):

- `DATABASE_URL` — **linked via Connect to a service** (preferred) or pasted from “Get connection details”
- `JWT_SECRET` (≥32)
- `COOKIE_SECRET` (≥32)
- `ENCRYPTION_KEY` (64 hex)
- `WEB_URL` / `API_URL` / `NEXT_PUBLIC_API_URL` → your public URL
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- GetGas / Tron keys as needed

### DATABASE_URL rules (most common failure)

1. **Missing** → pre-deploy: `Environment variable not found: DATABASE_URL`
2. **Stale password (P1000)** → after “Get connection details” or “Connect to a service”, the DB password **rotates**. Update `DATABASE_URL` immediately and redeploy.
3. Prefer **tron-db → Connect → Connect to a service → monitor** so Voroa injects a linked URL (not a manual “Not connected” row).
4. Trusted sources: leave **empty** to allow all, or rely on workspace-internal access. Do not leave example IPs (`203.0.113.7`, `198.51.100.0/24`) if they act as a real allowlist.

### Smoke checks

- `GET /health` → `checks.database.status` should be `ok`
- `GET /ready` → `{ "ready": true }`

## Ubuntu production notes

- Use Node 20+ LTS or Compose images
- Put TLS terminator (Caddy/Nginx) in front of `web` + `api`
- Restrict DB to private network
- Set `NODE_ENV=production`, `APP_ENV=production`
- Prefer `TRON_NETWORK=mainnet` only with production secrets
- For staging, use `shasta` / `nile`

No Kubernetes required.

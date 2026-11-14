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

## Render (Blueprint)

Repo root `render.yaml` deploys **tron-api**, **tron-web**, **tron-worker**. It does **not** create Postgres — use your existing Render database.

1. Dashboard → **New** → **Blueprint** → select `harshdefideploy/ser` (branch `main`)
2. When prompted, set:
   - `DATABASE_URL` = **Internal Database URL** from your existing Render Postgres
   - `ENCRYPTION_KEY` = 64 hex chars
   - `ADMIN_PASSWORD` = your admin password
   - Tron / GetGas secrets as needed
3. Prefer the Blueprint **region** matching your Postgres region (default in file: `singapore`)
4. After deploy:
   - `GET https://tron-api.onrender.com/health`
   - `https://tron-web.onrender.com/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
5. Worker uses **Starter** plan (Render background workers are not free). Skip creating `tron-worker` if you only need admin UI + API for now.

`API_URL` / `WEB_URL` / `NEXT_PUBLIC_API_URL` are wired from each service’s `RENDER_EXTERNAL_URL`.

## Voroa (full stack: monitor + web + worker + tron-db)

Deploy **three** Node services from the same repo + one Postgres (`tron-db`).

### 1) `monitor` (API)

| Setting | Recommended value |
|---|---|
| Node | **20** or **22** |
| Install | platform default (`pnpm install --frozen-lockfile`) |
| Build | `npm run build:api` |
| Pre-deploy | *(empty — migrate/seed run in start)* |
| Start | `npm run start:release` |

(`start:release` = migrate → seed admin/settings → start API.)

### 2) `web` (admin UI)

| Setting | Recommended value |
|---|---|
| Node | **20** or **22** |
| Build | `npm run build:web` |
| Pre-deploy | *(empty)* |
| Start | `npm run start:web` |

**Build-time env (required on Voroa Environment before first web build):**

- `NEXT_PUBLIC_API_URL` = `https://monitor.onvoroa.com` (or your API public URL)

Runtime: `PORT` is set by the platform; Next binds `0.0.0.0`.

### 3) `worker` (background jobs)

| Setting | Recommended value |
|---|---|
| Node | **20** or **22** |
| Build | `npm run build:api` |
| Pre-deploy | *(empty)* |
| Start | `npm run start:worker` |

Same secrets/DB as `monitor`. Set `WORKER_ENABLED=true`.

### Required env on `monitor` / `worker`

Must be present (runtime; also needed for migrate/seed):

- `DATABASE_URL` — **linked via Connect to a service** (preferred) or pasted from “Get connection details”
- `JWT_SECRET` (≥32)
- `COOKIE_SECRET` (≥32)
- `ENCRYPTION_KEY` (64 hex)
- `API_URL` → public API URL (e.g. `https://monitor.onvoroa.com`)
- `WEB_URL` → public **web** URL (e.g. `https://web.onvoroa.com`) — CORS + cookies
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — first seed only creates admin
- GetGas / Tron keys as needed

### Required env on `web`

- `NEXT_PUBLIC_API_URL` → same as `API_URL` (must be present at **build** time)

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

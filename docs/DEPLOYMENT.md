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

## Ubuntu production notes

- Use Node 22 LTS or Compose images
- Put TLS terminator (Caddy/Nginx) in front of `web` + `api`
- Restrict DB to private network
- Set `NODE_ENV=production`, `APP_ENV=production`
- Prefer `TRON_NETWORK=mainnet` only with production secrets
- For staging, use `shasta` / `nile`

No Kubernetes required.

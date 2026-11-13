# TRON TRX Gas Sponsorship Server

Production monorepo: detect qualifying **inbound TRX** to the master wallet, then provision a **fixed GetGas package** (Energy + Bandwidth) to the sender.

## Business flow

```text
USER WALLET
    |
    | sends qualifying TRX
    v
MASTER TRON WALLET
    |
    | detect incoming TRX (TronGrid)
    v
TRX CONFIRMED
    |
    | verify amount + duplicate TXID
    v
CREATE 1 SPONSORSHIP CREDIT
    |
    v
GETGAS
    |
    +---- 150,000 ENERGY
    |
    +---- 1,000 BANDWIDTH
    |
    v
SPONSORSHIP COMPLETE
```

**Rules:**

- `1 qualifying TRX deposit (unique TXID) = 1 SponsorshipCredit`
- Fixed package every time: **150000 Energy + 1000 Bandwidth** (configurable defaults)
- Deduplication is by **TXID**, not wallet address

The system does **not** inspect or depend on the user's existing Energy, Bandwidth, TRX balance, USDT balance, or other token balances.

This is **not** a custodial wallet. The service never asks for private keys, seed phrases, or passwords from end users—only public TRON addresses.

---

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 15, TypeScript, Tailwind, TanStack Query |
| API | Node 22, Fastify, Zod, Prisma |
| DB | PostgreSQL |
| Chain | TronGrid — master wallet inbound TRX only |
| Provider | GetGas (real API) |

---

## Quick start

### 1. Prerequisites

- Node.js **22+**
- Docker Desktop (for Postgres) **or** a local PostgreSQL 16

### 2. Environment

```bash
cp .env.example .env
```

Set at least: `JWT_SECRET`, `COOKIE_SECRET`, `ENCRYPTION_KEY`, `ADMIN_EMAIL` / `ADMIN_PASSWORD`, `DATABASE_URL`, `MASTER_TRON_ADDRESS`.

### 3. Install

Prefer **npm** on Windows volumes that block symlinks (common on non-NTFS Desktop paths).

```bash
npm install
```

### 4. Database

```bash
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

Postgres is on host port **55432** by default.

### 5. Run

```bash
npm run dev:api
npm run dev:web
npm run dev:worker
```

- API: http://localhost:4000/health  
- Web: http://localhost:3000/login  

### 6. Validate

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---

## Workers

1. TRX master wallet monitor  
2. TRX confirmation processor  
3. Sponsorship provisioning  
4. GetGas order status  
5. Retry worker  
6. Expiry worker  

No USDT/token/user-wallet monitors.

---

## Documentation

See [`docs/`](./docs/) for architecture, database, TRON monitoring, GetGas, sponsorship flow, security, and deployment.

Final production audit: [`docs/FINAL_AUDIT_REPORT.md`](./docs/FINAL_AUDIT_REPORT.md) (generated after validation).

---

## Security

- Never commit `.env`
- Never expose `GETGAS_API_KEY` or `TRONGRID_API_KEY` to the frontend
- Never collect user private keys or seed phrases
- Admin auth uses HTTP-only cookies + bcrypt password hashes

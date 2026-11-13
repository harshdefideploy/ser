# Database

PostgreSQL + Prisma.

## Core models

- `AdminUser` — dashboard operators
- `MasterWallet` — unique receiving address; `enabled` + `network` for monitoring
- `Wallet` — unique `(address, network)` (sender addresses from deposits)
- `TRXDeposit` — unique `txid`; optional `masterWalletId` (receiving master)
- `SponsorshipCredit` — unique `depositId` (1 credit per deposit)
- `ProviderOrder` — unique `(creditId, resourceType)` + unique `idempotencyKey`
- `AuditLog`, `SystemSetting`, `WorkerState`, `DailyAnalytics`

## Required uniqueness

| Constraint | Purpose |
|------------|---------|
| `TRXDeposit.txid` UNIQUE | No duplicate deposits / credits for same chain TX |
| `SponsorshipCredit.depositId` UNIQUE | Exactly one credit per deposit |
| `ProviderOrder.idempotencyKey` UNIQUE | No duplicate GetGas orders |
| `ProviderOrder (creditId, resourceType)` UNIQUE | One ENERGY + one BANDWIDTH per credit |

## Indexes

- `TRXDeposit`: `txid`, `toAddress`, `status`, `createdAt` (+ `fromAddress`, `detectedAt`)
- `SponsorshipCredit`: `depositId`, `(walletId, status)`, `(status, expiresAt)`
- `ProviderOrder`: `providerOrderId`, `creditId`, `status`

## Idempotency

- Same deposit TX → one `TRXDeposit`
- Same deposit → one `SponsorshipCredit`
- Same credit + ENERGY/BANDWIDTH → one order each

## Migrations

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Latest cleanup migration drops the unused `sponsored_transactions` table (USDT/token monitoring removed from product scope): `20260314000003_drop_sponsored_transactions`.

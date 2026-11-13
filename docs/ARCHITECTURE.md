# Architecture

## Overview

Monorepo with clear separation:

| Package / App | Responsibility |
|---------------|----------------|
| `apps/web` | Admin UI only — no secrets, no provider keys |
| `apps/api` | REST API, auth, business reads/writes |
| `apps/api` workers | Background jobs (TRX monitor → GetGas) |
| `packages/database` | Prisma schema & client |
| `packages/config` | Environment validation |
| `packages/shared` | Shared DTO/status/constants |

## Final business flow

```text
Master Wallet A/B/C… (enabled MasterWallet rows)
  → TronGrid (inbound TRX only, sequential poll, per-wallet checkpoint)
  → Deposit Processor (amount + confirmations + TXID uniqueness)
  → Sponsorship Credit (1:1 with deposit)
  → GetGas
  → 150K Energy + 1K Bandwidth
  → Sponsorship complete (ACTIVE)
```

## Blockchain scope

- **Only** enabled `MasterWallet` receiving addresses are monitored (legacy `MASTER_TRON_ADDRESS` migrates into this table)
- **Only** incoming TRX (`TransferContract`) is accepted
- No USDT monitoring
- No TRC-20 / token monitoring
- No user-wallet polling
- No user Energy / Bandwidth / TRX / USDT balance checks

The system does not inspect or depend on the user's existing Energy, Bandwidth, TRX balance, USDT balance, or other token balances.

## Fundamental rules

- `1 qualifying TXID = 1 SponsorshipCredit`
- Fixed package from settings (defaults 150000 / 1000) — never resized by wallet balances
- Provider failures retry the **same** credit / idempotency keys — never a new credit

## Network isolation

`TRON_NETWORK` + `APP_ENV` distinguish mainnet vs testnet. Test mode must never silently use production funds.

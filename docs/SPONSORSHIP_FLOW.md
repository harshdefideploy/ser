# Sponsorship flow

## Business rule — credit economy

```text
1 qualifying TRX deposit (unique TXID)
  = 1 sponsorship credit
  = 1 fixed GetGas package (Energy + Bandwidth)
```

Deduplication is by **TXID / database uniqueness**, not wallet address.

## Business rule — fixed resource package

**Never inspect or calculate the user's existing Energy, Bandwidth, TRX, USDT, or token balances.**

Every confirmed qualifying TRX deposit triggers the **same standard package** from admin settings (defaults):

```text
ENERGY_TARGET     = 150000
BANDWIDTH_TARGET  = 1000
```

Always request/provision **both** resources.

Do **NOT**:

- check whether the user already has Energy
- check whether the user already has Bandwidth
- reduce the requested amount because the user has existing resources
- skip Bandwidth or Energy
- wait for a USDT/token transfer to mark the credit used

## Happy path

```text
QUALIFYING TRX DEPOSIT
        ↓
CONFIRMATIONS
        ↓
CREATE 1 CREDIT
        ↓
REQUEST ENERGY_TARGET (default 150,000)
        ↓
REQUEST BANDWIDTH_TARGET (default 1,000)
        ↓
WAIT FOR BOTH ORDERS TO BE FILLED
        ↓
CREDIT = ACTIVE
```

## Provider failure / retry

If either provider order fails:

- retry according to `providerOrderMaxRetries`
- do **not** create another credit
- do **not** create duplicate provider orders (idempotency key = `{creditId}-ENERGY` / `{creditId}-BANDWIDTH`)
- keep the credit in `PROVISIONING` / `PARTIALLY_PROVISIONED` / `RETRYING`
- after retry exhaustion → `FAILED` + admin alert (`PROVIDER_RETRY_EXHAUSTED`)

## Credit statuses

`PENDING` → `PROVISIONING` → (`PARTIALLY_PROVISIONED` | `RETRYING`) → `ACTIVE`

Also: `USED` (legacy/expiry paths), `EXPIRED`, `FAILED`, `CANCELLED`

## Expiry

Unused `ACTIVE` credits expire after `sponsorshipExpiryHours` (default 24). No auto-renew.

## Code anchors

- `packages/shared/src/sponsorship-package.ts` — `buildFixedSponsorshipPackage()`
- `apps/api/src/services/provisioning.service.ts` — `planFixedSponsorshipOrders()`

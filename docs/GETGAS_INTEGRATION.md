# GetGas integration

Official docs: https://getgas.io/developers/docs

## Base URL (current)

```text
https://getgas.io/api/v1
```

(Earlier drafts used `https://api.getgas.io` — that is **not** the documented base.)

## Auth

```http
Authorization: Bearer <GETGAS_API_KEY>
```

Server-side only. Never exposed to the frontend.

## Create order

```http
POST /orders
Idempotency-Key: {creditId}-ENERGY
Content-Type: application/json

{
  "resource": "energy" | "bandwidth",
  "address": "<user TRON address>",
  "volume": 150000,
  "term": "1h"
}
```

Idempotency-Key charset: `[A-Za-z0-9-_]` (8–64). Use **hyphen**, not colon.

## Status

```http
GET /orders/{id}
```

Poll until `filled` or `refunded` / failed. Prefer polling over inventing webhooks.

## Account balance

```http
GET /account
```

Returns **our** GetGas balance — never used to inspect end-user Energy/Bandwidth.

## Business rule

Every sponsorship requests the **full** configured package:

- Energy = `energyTarget` (default 150000)
- Bandwidth = `bandwidthTarget` (default 1000)

Never resize/skip based on the user’s wallet resources.

## Doc deltas vs earlier assumptions

| Assumption | Current docs |
|---|---|
| Base `api.getgas.io` | Use `getgas.io/api/v1` |
| Colon idempotency keys | Hyphen only |
| Webhooks required | Polling is primary |

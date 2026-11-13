# Security

## Implemented

- bcrypt password hashing (cost 12)
- HTTP-only session cookies (JWT via `jose`; Secure in production)
- Helmet security headers
- CORS locked to `WEB_URL`
- Rate limiting
- Zod input validation
- Admin role checks on mutating settings
- Dangerous settings require `confirmDangerous`
- Audit log for login + settings
- Structured logs with secret redaction
- Encryption helper for secrets at rest (`ENCRYPTION_KEY`)
- Prisma parameterized queries
- TRON address validation before deposit processing
- Blockchain data verified server-side (never trust frontend TX confirmation)

## Secrets (server-only)

- `GETGAS_API_KEY`
- `TRONGRID_API_KEY`
- `JWT_SECRET` / `COOKIE_SECRET` / `ENCRYPTION_KEY`
- `GETGAS_WEBHOOK_SECRET` (optional; webhook is acknowledge-only)

Never expose provider keys to the frontend. Never commit `.env`.

## Never

- Collect end-user private keys / seeds
- Custodial wallet signing
- Log passwords, tokens, API keys
- Inspect user Energy / Bandwidth / USDT / token balances for eligibility

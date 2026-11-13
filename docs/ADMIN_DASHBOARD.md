# Admin dashboard

## Routes

- `/admin` — overview stats
- `/admin/wallets` (+ detail)
- `/admin/deposits`
- `/admin/sponsorships` (+ detail)
- `/admin/transactions`
- `/admin/providers`
- `/admin/orders`
- `/admin/analytics`
- `/admin/settings`
- `/admin/audit`
- `/login`

## Design

Dark ops UI, status colors:

- green success
- yellow pending
- red failed
- blue active
- gray inactive

Phase 1 pages are wired to live API endpoints; tables are empty until Phase 2+ workers run.

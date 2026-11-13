# Testing

```bash
npm test
```

Runs API unit/regression tests covering the final TRX → fixed package architecture.

## Required coverage (final architecture)

1. Incoming qualifying TRX detected  
2. Below-minimum TRX ignored  
3. Outgoing master transaction ignored  
4. Wrong recipient ignored  
5. Unconfirmed transaction not credited (confirmation path)  
6. Confirmed transaction creates exactly one credit  
7. Duplicate TXID creates no duplicate credit  
8. Fixed package always returns 150000 Energy  
9. Fixed package always returns 1000 Bandwidth  
10. User resource balances are never queried (regression)  
11–13. Energy/Bandwidth provider orders + duplicate prevention  
14–15. Provider failure → RETRYING → FAILED  
16. Worker restart remains idempotent (unique keys)  
17. Invalid TRON address rejected  
18. Admin authentication validation  

## Rule

Never report PASS unless the command actually succeeded.

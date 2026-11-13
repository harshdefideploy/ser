# TRON monitoring

## Scope

**Only enabled MasterWallet rows** (receiving / master addresses) are monitored for inbound TRX.

Multiple masters are supported. Each enabled wallet on the active `TRON_NETWORK` is polled **sequentially** in one worker cycle, with an **independent** checkpoint:

```text
WorkerState.workerName = trx-deposit-monitor:{masterWalletId}
```

Legacy `MASTER_TRON_ADDRESS` / settings `masterWalletAddress` are migrated into the `MasterWallet` table (database is the source of truth).

We do **not**:

- poll user wallets
- read user Energy / Bandwidth / TRX / USDT / token balances
- monitor USDT or other TRC-20 transfers
- use token transfers to trigger sponsorship

## Official endpoint

TronGrid V1 (indexed account history):

```http
GET {TRON_RPC_URL}/v1/accounts/{MASTER}/transactions
  ?only_to=true
  &limit=50
  &order_by=block_timestamp,asc
  &min_timestamp={checkpoint}
Header: TRON-PRO-API-KEY: <server-only>
```

Docs: https://developers.tron.network/reference/get-transaction-info-by-account-address

Pagination: `meta.fingerprint` (keep other query params identical).

## Filtering

Accept only:

- `raw_data.contract[].type === TransferContract`
- `to_address == MASTER`
- amount (sun / 1e6) >= `minimumQualifyingTrx`
- unique `txid`

Ignore outgoing, TRC-20, duplicates, below-minimum.

## Confirmations

Deposits start as `DETECTED` / `WAITING_CONFIRMATIONS`.

Confirmation worker uses `/wallet/getnowblock` and `confirmationsRequired` before creating a `SponsorshipCredit`.

## Checkpoint

Stored in `WorkerState.cursor` for worker `trx-deposit-monitor` as JSON:

```json
{ "minTimestampMs": 0, "lastTxId": "..." }
```

Restart-safe; `txid` uniqueness prevents duplicates.

import { getEnv } from "../config/index.js";
import { logEvent, logger } from "../lib/logger.js";
import { recordIncomingDeposit } from "../modules/tron/deposit.service.js";
import { TronGridClient } from "../modules/tron/trongrid.client.js";
import { parseIncomingTrxTransfers } from "../modules/tron/trx-parser.js";
import { isValidTronAddress } from "../modules/tron/tron.address.js";
import {
  listEnabledMasterWalletsForNetwork,
  monitorWorkerName,
  type MasterWalletRow,
} from "../services/master-wallet.service.js";
import { getWorkerCursor, markWorkerRun } from "./worker-state.js";

const AGGREGATE_WORKER_NAME = "trx-deposit-monitor";

export interface MonitorCheckpoint {
  minTimestampMs: number;
  fingerprint?: string;
  lastTxId?: string;
}

export function parseCheckpoint(raw: string | null): MonitorCheckpoint {
  if (!raw) {
    return { minTimestampMs: 0 };
  }
  try {
    const parsed = JSON.parse(raw) as MonitorCheckpoint;
    return {
      minTimestampMs: Number(parsed.minTimestampMs) || 0,
      fingerprint: parsed.fingerprint,
      lastTxId: parsed.lastTxId,
    };
  } catch {
    return { minTimestampMs: 0 };
  }
}

/**
 * Poll ONE master wallet for inbound native TRX (TransferContract).
 * Independent checkpoint per wallet via WorkerState name
 * `trx-deposit-monitor:{masterWalletId}`.
 */
export async function monitorMasterWallet(
  wallet: MasterWalletRow,
  client = new TronGridClient(),
): Promise<{ processed: number; created: number }> {
  const workerName = monitorWorkerName(wallet.id);

  if (!isValidTronAddress(wallet.address)) {
    await markWorkerRun(workerName, {
      ok: false,
      error: "Invalid master wallet address",
    });
    return { processed: 0, created: 0 };
  }

  const env = getEnv();
  if (wallet.network !== env.TRON_NETWORK) {
    await markWorkerRun(workerName, {
      ok: true,
      error: `Skipped: wallet network ${wallet.network} != TRON_NETWORK ${env.TRON_NETWORK}`,
    });
    return { processed: 0, created: 0 };
  }

  const checkpoint = parseCheckpoint(await getWorkerCursor(workerName));
  let fingerprint = checkpoint.fingerprint;
  let maxSeenTimestamp = checkpoint.minTimestampMs;
  let lastTxId = checkpoint.lastTxId;
  let processed = 0;
  let created = 0;
  let pages = 0;

  try {
    do {
      const page = await client.getAccountTransactions({
        address: wallet.address,
        onlyTo: true,
        limit: 50,
        fingerprint,
        minTimestamp: checkpoint.minTimestampMs || undefined,
        orderBy: "block_timestamp,asc",
      });

      const transfers = parseIncomingTrxTransfers(
        page.data ?? [],
        wallet.address,
      );
      for (const transfer of transfers) {
        processed += 1;
        if (
          transfer.blockTimestampMs !== null &&
          transfer.blockTimestampMs < checkpoint.minTimestampMs
        ) {
          continue;
        }
        if (
          transfer.blockTimestampMs === checkpoint.minTimestampMs &&
          lastTxId &&
          transfer.txid === lastTxId
        ) {
          continue;
        }

        const result = await recordIncomingDeposit(transfer, {
          masterWalletId: wallet.id,
          masterAddress: wallet.address,
          network: wallet.network,
        });
        if (result.created) created += 1;

        if (
          transfer.blockTimestampMs !== null &&
          transfer.blockTimestampMs >= maxSeenTimestamp
        ) {
          maxSeenTimestamp = transfer.blockTimestampMs;
          lastTxId = transfer.txid;
        }
      }

      fingerprint = page.meta?.fingerprint;
      pages += 1;
      if (pages >= 20) break;
      if (!fingerprint || (page.data?.length ?? 0) === 0) break;
    } while (fingerprint);

    const nextCursor: MonitorCheckpoint = {
      minTimestampMs: Math.max(0, maxSeenTimestamp - 1000),
      lastTxId,
    };

    await markWorkerRun(workerName, {
      ok: true,
      cursor: JSON.stringify(nextCursor),
      error: null,
    });

    if (created > 0) {
      logEvent("TRX_MONITOR_BATCH", {
        processed,
        created,
        masterWalletId: wallet.id,
        master: wallet.address,
      });
    }

    return { processed, created };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      service: "worker",
      event: "TRX_MONITOR_FAILED",
      masterWalletId: wallet.id,
      error: message,
    });
    await markWorkerRun(workerName, { ok: false, error: message });
    throw err;
  }
}

/**
 * Sequential poll of all enabled master wallets for the active TRON_NETWORK.
 * One worker cycle — not one process per wallet.
 */
export async function runTrxDepositMonitorOnce(
  client = new TronGridClient(),
): Promise<{ processed: number; created: number; wallets: number }> {
  const env = getEnv();
  const wallets = await listEnabledMasterWalletsForNetwork(env.TRON_NETWORK);

  if (wallets.length === 0) {
    await markWorkerRun(AGGREGATE_WORKER_NAME, {
      ok: true,
      error: "No enabled MasterWallet rows for current TRON_NETWORK",
    });
    return { processed: 0, created: 0, wallets: 0 };
  }

  let processed = 0;
  let created = 0;
  const errors: string[] = [];

  for (const wallet of wallets) {
    try {
      const result = await monitorMasterWallet(wallet, client);
      processed += result.processed;
      created += result.created;
    } catch (err) {
      errors.push(
        `${wallet.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  await markWorkerRun(AGGREGATE_WORKER_NAME, {
    ok: errors.length === 0,
    error: errors.length ? errors.join("; ") : null,
  });

  return { processed, created, wallets: wallets.length };
}

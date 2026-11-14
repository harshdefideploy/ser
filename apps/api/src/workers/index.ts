import { getEnv } from "../config/index.js";
import { logger } from "../lib/logger.js";
import { getSystemSettings } from "../services/settings.service.js";
import { runTrxDepositMonitorOnce } from "./trx-deposit-monitor.js";
import { runTrxConfirmationOnce } from "./trx-confirmation.js";
import { runSponsorshipProvisioningOnce } from "./sponsorship-provisioning.js";
import { runGetGasOrderStatusOnce } from "./getgas-order-status.js";
import { runRetryWorkerOnce } from "./retry-worker.js";
import { runExpiryWorkerOnce } from "./expiry-worker.js";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tick(): Promise<void> {
  await runTrxDepositMonitorOnce().catch((err) => {
    logger.error({
      service: "worker",
      event: "TICK_MONITOR_ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
  });
  await runTrxConfirmationOnce().catch((err) => {
    logger.error({
      service: "worker",
      event: "TICK_CONFIRM_ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
  });
  await runSponsorshipProvisioningOnce().catch((err) => {
    logger.error({
      service: "worker",
      event: "TICK_PROVISION_ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
  });
  await runGetGasOrderStatusOnce().catch((err) => {
    logger.error({
      service: "worker",
      event: "TICK_STATUS_ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
  });
  await runRetryWorkerOnce().catch((err) => {
    logger.error({
      service: "worker",
      event: "TICK_RETRY_ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
  });
  await runExpiryWorkerOnce().catch((err) => {
    logger.error({
      service: "worker",
      event: "TICK_EXPIRY_ERROR",
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

let loopStarted = false;

/**
 * Run the deposit → confirm → GetGas pipeline in-process.
 * Safe to call from the API server when no dedicated worker service exists.
 */
export function startBackgroundWorkers(): void {
  const env = getEnv();
  if (!env.WORKER_ENABLED) {
    logger.info({
      service: "worker",
      event: "WORKER_DISABLED",
      message: "WORKER_ENABLED=false",
    });
    return;
  }
  if (loopStarted) return;
  loopStarted = true;

  logger.info({
    service: "worker",
    event: "WORKER_BOOT",
    network: env.TRON_NETWORK,
    appEnv: env.APP_ENV,
    message:
      "Master-wallet TRX monitor + confirmation + GetGas provisioning workers started",
  });

  void (async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const settings = await getSystemSettings().catch(() => null);
      const interval =
        settings?.monitorIntervalMs ?? env.TRONGRID_POLL_INTERVAL;
      await tick();
      await sleep(Math.max(1000, interval));
    }
  })();
}

async function main() {
  startBackgroundWorkers();
  if (!getEnv().WORKER_ENABLED) {
    return;
  }
  // Keep standalone worker process alive.
  await new Promise(() => {});
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("workers/index.js") ||
    process.argv[1].endsWith("workers\\index.js") ||
    process.argv[1].endsWith("workers/index.ts") ||
    process.argv[1].endsWith("workers\\index.ts"));

if (isDirectRun) {
  void main();
}

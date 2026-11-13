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

async function tick(): Promise<void> {
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

async function main() {
  const env = getEnv();

  if (!env.WORKER_ENABLED) {
    logger.info({
      service: "worker",
      event: "WORKER_DISABLED",
      message: "WORKER_ENABLED=false",
    });
    return;
  }

  logger.info({
    service: "worker",
    event: "WORKER_BOOT",
    network: env.TRON_NETWORK,
    appEnv: env.APP_ENV,
    message:
      "Master-wallet TRX monitor + confirmation + GetGas provisioning workers started",
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const settings = await getSystemSettings().catch(() => null);
    const interval =
      settings?.monitorIntervalMs ?? env.TRONGRID_POLL_INTERVAL;
    await tick();
    await sleep(interval);
  }
}

void main();

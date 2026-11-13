import { prisma } from "@tron-gas-sponsor/database";
import { logger } from "../lib/logger.js";
import { TronGridClient } from "../modules/tron/trongrid.client.js";
import { confirmDepositAndCreateCredit } from "../services/sponsorship.service.js";
import { getSystemSettings } from "../services/settings.service.js";
import { markWorkerRun } from "./worker-state.js";

const WORKER_NAME = "trx-confirmation";

export async function runTrxConfirmationOnce(
  client = new TronGridClient(),
): Promise<{ checked: number; confirmed: number }> {
  const settings = await getSystemSettings();
  const required = settings.confirmationsRequired;

  let checked = 0;
  let confirmed = 0;

  try {
    const now = await client.getNowBlock();
    const pending = await prisma.tRXDeposit.findMany({
      where: {
        status: { in: ["DETECTED", "WAITING_CONFIRMATIONS"] },
      },
      orderBy: { detectedAt: "asc" },
      take: 100,
    });

    for (const deposit of pending) {
      checked += 1;
      if (deposit.blockNumber === null || deposit.blockNumber === undefined) {
        await prisma.tRXDeposit.update({
          where: { id: deposit.id },
          data: { status: "WAITING_CONFIRMATIONS" },
        });
        continue;
      }

      const conf = Math.max(
        0,
        now.blockNumber - Number(deposit.blockNumber) + 1,
      );

      if (conf < required) {
        await prisma.tRXDeposit.update({
          where: { id: deposit.id },
          data: {
            confirmations: conf,
            status: "WAITING_CONFIRMATIONS",
          },
        });
        continue;
      }

      const result = await confirmDepositAndCreateCredit(deposit.id, conf);
      if (result.confirmed && result.creditId) {
        confirmed += 1;
      }
    }

    await markWorkerRun(WORKER_NAME, { ok: true, error: null });
    return { checked, confirmed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      service: "worker",
      event: "TRX_CONFIRMATION_FAILED",
      error: message,
    });
    await markWorkerRun(WORKER_NAME, { ok: false, error: message });
    throw err;
  }
}

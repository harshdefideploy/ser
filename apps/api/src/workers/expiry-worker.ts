import { prisma } from "@tron-gas-sponsor/database";
import { LOG_EVENTS } from "@tron-gas-sponsor/shared";
import { logEvent, logger } from "../lib/logger.js";
import { markWorkerRun } from "./worker-state.js";

const WORKER_NAME = "expired-sponsorship";

export async function runExpiryWorkerOnce(): Promise<{ expired: number }> {
  try {
    const result = await prisma.sponsorshipCredit.updateMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lte: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    if (result.count > 0) {
      logEvent(LOG_EVENTS.SPONSORSHIP_EXPIRED, { count: result.count });
    }

    await markWorkerRun(WORKER_NAME, { ok: true, error: null });
    return { expired: result.count };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      service: "worker",
      event: "EXPIRY_WORKER_FAILED",
      error: message,
    });
    await markWorkerRun(WORKER_NAME, { ok: false, error: message });
    throw err;
  }
}

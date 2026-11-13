import { prisma } from "@tron-gas-sponsor/database";
import { getEnv } from "../config/index.js";
import { logger } from "../lib/logger.js";
import { GetGasProvider } from "../modules/provider/getgas.service.js";
import { getSystemSettings } from "../services/settings.service.js";
import { canPlaceProviderOrders } from "../services/provider-spend.service.js";
import { markWorkerRun } from "./worker-state.js";

const WORKER_NAME = "retry-worker";

/**
 * Retry FAILED provider orders for the same credit (no new credit, same idempotency key).
 */
export async function runRetryWorkerOnce(
  provider = new GetGasProvider(),
): Promise<{ retried: number }> {
  let retried = 0;

  try {
    if (!getEnv().GETGAS_API_KEY) {
      await markWorkerRun(WORKER_NAME, {
        ok: true,
        error: "GETGAS_API_KEY not configured",
      });
      return { retried: 0 };
    }

    const spend = await canPlaceProviderOrders();
    if (!spend.allowed) {
      await markWorkerRun(WORKER_NAME, {
        ok: true,
        error: `Retry paused: ${spend.reason}`,
      });
      return { retried: 0 };
    }

    const settings = await getSystemSettings();
    const failed = await prisma.providerOrder.findMany({
      where: { status: "FAILED" },
      include: { credit: { include: { wallet: true } } },
      take: 20,
    });

    for (const order of failed) {
      const meta = (order.metadataJson ?? {}) as { retryCount?: number };
      const retryCount = meta.retryCount ?? 0;
      if (retryCount >= settings.providerOrderMaxRetries) {
        continue;
      }

      retried += 1;
      await prisma.sponsorshipCredit.update({
        where: { id: order.creditId },
        data: { status: "RETRYING" },
      });

      try {
        const result =
          order.resourceType === "ENERGY"
            ? await provider.createEnergyOrder({
                walletAddress: order.credit.wallet.address,
                amount: Number(order.requestedAmount),
                idempotencyKey: order.idempotencyKey,
              })
            : await provider.createBandwidthOrder({
                walletAddress: order.credit.wallet.address,
                amount: Number(order.requestedAmount),
                idempotencyKey: order.idempotencyKey,
              });

        await prisma.providerOrder.update({
          where: { id: order.id },
          data: {
            providerOrderId: result.providerOrderId,
            status:
              result.status === "FILLED"
                ? "FILLED"
                : result.status === "FAILED"
                  ? "FAILED"
                  : "SUBMITTED",
            providerCostTrx: result.costTrx?.toString(),
            deliveredAmount: result.deliveredAmount?.toString(),
            filledAt: result.status === "FILLED" ? new Date() : null,
            failedAt: result.status === "FAILED" ? new Date() : null,
            lastError: null,
            metadataJson: {
              ...(typeof order.metadataJson === "object" &&
              order.metadataJson !== null
                ? (order.metadataJson as object)
                : {}),
              retryCount: retryCount + 1,
              lastRetryAt: new Date().toISOString(),
            },
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.providerOrder.update({
          where: { id: order.id },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            lastError: message,
            metadataJson: {
              ...(typeof order.metadataJson === "object" &&
              order.metadataJson !== null
                ? (order.metadataJson as object)
                : {}),
              retryCount: retryCount + 1,
              lastRetryAt: new Date().toISOString(),
            },
          },
        });
      }
    }

    await markWorkerRun(WORKER_NAME, { ok: true, error: null });
    return { retried };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      service: "worker",
      event: "RETRY_WORKER_FAILED",
      error: message,
    });
    await markWorkerRun(WORKER_NAME, { ok: false, error: message });
    throw err;
  }
}

import { prisma } from "@tron-gas-sponsor/database";
import { LOG_EVENTS } from "@tron-gas-sponsor/shared";
import { getEnv } from "../config/index.js";
import { logEvent, logger } from "../lib/logger.js";
import { GetGasProvider } from "../modules/provider/getgas.service.js";
import { nextProvisioningStatus } from "../services/provisioning.service.js";
import { getSystemSettings } from "../services/settings.service.js";
import { markWorkerRun } from "./worker-state.js";

const WORKER_NAME = "getgas-order-status";

export async function runGetGasOrderStatusOnce(
  provider = new GetGasProvider(),
): Promise<{ synced: number }> {
  let synced = 0;

  try {
    if (!getEnv().GETGAS_API_KEY) {
      await markWorkerRun(WORKER_NAME, {
        ok: true,
        error: "GETGAS_API_KEY not configured",
      });
      return { synced: 0 };
    }

    const settings = await getSystemSettings();
    const openOrders = await prisma.providerOrder.findMany({
      where: {
        status: { in: ["PENDING", "SUBMITTED", "FAILED"] },
        providerOrderId: { not: null },
      },
      take: 50,
      orderBy: { requestedAt: "asc" },
    });

    const creditIds = new Set<string>();

    for (const order of openOrders) {
      if (!order.providerOrderId) continue;
      // Skip FAILED until retry worker clears/requeues
      if (order.status === "FAILED") {
        creditIds.add(order.creditId);
        continue;
      }

      synced += 1;
      try {
        const status = await provider.getOrderStatus(order.providerOrderId);
        await prisma.providerOrder.update({
          where: { id: order.id },
          data: {
            status:
              status.status === "FILLED"
                ? "FILLED"
                : status.status === "FAILED"
                  ? "FAILED"
                  : status.status === "PENDING"
                    ? "PENDING"
                    : "SUBMITTED",
            deliveredAmount:
              status.deliveredAmount !== undefined
                ? status.deliveredAmount.toString()
                : undefined,
            providerCostTrx:
              status.costTrx !== undefined
                ? status.costTrx.toString()
                : undefined,
            filledAt: status.status === "FILLED" ? new Date() : undefined,
            failedAt: status.status === "FAILED" ? new Date() : undefined,
            lastError:
              status.status === "FAILED" ? "Provider reported failure" : null,
          },
        });
        if (status.status === "FILLED") {
          logEvent(LOG_EVENTS.PROVIDER_ORDER_FILLED, {
            providerOrderId: order.providerOrderId,
            creditId: order.creditId,
          });
        }
      } catch (err) {
        logger.warn({
          service: "worker",
          event: "ORDER_STATUS_POLL_FAILED",
          orderId: order.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      creditIds.add(order.creditId);
    }

    for (const creditId of creditIds) {
      const orders = await prisma.providerOrder.findMany({
        where: { creditId },
      });
      const energy = orders.find((o) => o.resourceType === "ENERGY");
      const bandwidth = orders.find((o) => o.resourceType === "BANDWIDTH");
      const energyFilled = energy?.status === "FILLED";
      const bandwidthFilled = bandwidth?.status === "FILLED";
      const anyFailed = orders.some((o) => o.status === "FAILED");
      const failCount = orders.filter((o) => o.status === "FAILED").length;
      // metadataJson.retryCount optional; use failedAt presence + settings
      const retriesExhausted =
        anyFailed && failCount > 0
          ? orders.some((o) => {
              const meta = (o.metadataJson ?? {}) as { retryCount?: number };
              return (meta.retryCount ?? 0) >= settings.providerOrderMaxRetries;
            })
          : false;

      const next = nextProvisioningStatus({
        energyFilled: Boolean(energyFilled),
        bandwidthFilled: Boolean(bandwidthFilled),
        anyFailedAwaitingRetry: anyFailed && !retriesExhausted,
        retriesExhausted,
      });

      const credit = await prisma.sponsorshipCredit.findUnique({
        where: { id: creditId },
      });
      if (!credit || credit.status === "USED" || credit.status === "EXPIRED") {
        continue;
      }

      const data: {
        status: typeof next;
        activatedAt?: Date;
      } = { status: next };
      if (next === "ACTIVE" && !credit.activatedAt) {
        data.activatedAt = new Date();
        logEvent(LOG_EVENTS.SPONSORSHIP_ACTIVE, { creditId });
      }
      if (next === "FAILED") {
        logEvent(LOG_EVENTS.PROVIDER_RETRY_EXHAUSTED, { creditId });
        await prisma.auditLog.create({
          data: {
            action: LOG_EVENTS.PROVIDER_RETRY_EXHAUSTED,
            entityType: "SponsorshipCredit",
            entityId: creditId,
            metadata: { alert: true },
          },
        });
      }

      await prisma.sponsorshipCredit.update({
        where: { id: creditId },
        data,
      });
    }

    await markWorkerRun(WORKER_NAME, { ok: true, error: null });
    return { synced };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      service: "worker",
      event: "ORDER_STATUS_FAILED",
      error: message,
    });
    await markWorkerRun(WORKER_NAME, { ok: false, error: message });
    throw err;
  }
}

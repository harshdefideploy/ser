import { prisma } from "@tron-gas-sponsor/database";
import { LOG_EVENTS } from "@tron-gas-sponsor/shared";
import { getEnv } from "../config/index.js";
import { logEvent, logger } from "../lib/logger.js";
import { GetGasProvider } from "../modules/provider/getgas.service.js";
import { planFixedSponsorshipOrders } from "../services/provisioning.service.js";
import { canPlaceProviderOrders } from "../services/provider-spend.service.js";
import { markWorkerRun } from "./worker-state.js";

const WORKER_NAME = "sponsorship-provisioning";

/**
 * For PENDING credits: create ENERGY + BANDWIDTH provider orders (idempotent).
 * Never reads user Energy/Bandwidth — uses planFixedSponsorshipOrders only.
 */
export async function runSponsorshipProvisioningOnce(
  provider = new GetGasProvider(),
): Promise<{ processed: number }> {
  let processed = 0;

  try {
    if (!getEnv().GETGAS_API_KEY) {
      await markWorkerRun(WORKER_NAME, {
        ok: true,
        error: "GETGAS_API_KEY not configured",
      });
      return { processed: 0 };
    }

    const spend = await canPlaceProviderOrders();
    if (!spend.allowed) {
      await markWorkerRun(WORKER_NAME, {
        ok: true,
        error: `Provider orders paused: ${spend.reason}`,
      });
      return { processed: 0 };
    }

    const credits = await prisma.sponsorshipCredit.findMany({
      where: {
        status: { in: ["PENDING", "PROVISIONING", "RETRYING"] },
      },
      include: {
        wallet: true,
        providerOrders: true,
      },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    for (const credit of credits) {
      processed += 1;
      const planned = await planFixedSponsorshipOrders(credit.id);

      // Prefer snapshot on credit if present
      const energyAmount = credit.energyTarget || planned.energy.requestedAmount;
      const bandwidthAmount =
        credit.bandwidthTarget || planned.bandwidth.requestedAmount;

      await prisma.sponsorshipCredit.update({
        where: { id: credit.id },
        data: { status: "PROVISIONING" },
      });

      for (const spec of [
        {
          resourceType: "ENERGY" as const,
          amount: energyAmount,
          idempotencyKey: planned.energy.idempotencyKey,
          create: () =>
            provider.createEnergyOrder({
              walletAddress: credit.wallet.address,
              amount: energyAmount,
              idempotencyKey: planned.energy.idempotencyKey,
            }),
        },
        {
          resourceType: "BANDWIDTH" as const,
          amount: bandwidthAmount,
          idempotencyKey: planned.bandwidth.idempotencyKey,
          create: () =>
            provider.createBandwidthOrder({
              walletAddress: credit.wallet.address,
              amount: bandwidthAmount,
              idempotencyKey: planned.bandwidth.idempotencyKey,
            }),
        },
      ]) {
        const existing = credit.providerOrders.find(
          (o) => o.resourceType === spec.resourceType,
        );
        if (
          existing &&
          (existing.status === "FILLED" ||
            existing.status === "SUBMITTED" ||
            existing.status === "PENDING")
        ) {
          continue;
        }

        const orderRow =
          existing ??
          (await prisma.providerOrder.create({
            data: {
              creditId: credit.id,
              walletId: credit.walletId,
              provider: provider.name,
              resourceType: spec.resourceType,
              requestedAmount: spec.amount,
              status: "PENDING",
              idempotencyKey: spec.idempotencyKey,
            },
          }));

        try {
          const result = await spec.create();
          await prisma.providerOrder.update({
            where: { id: orderRow.id },
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
              filledAt: result.status === "FILLED" ? new Date() : undefined,
              failedAt: result.status === "FAILED" ? new Date() : undefined,
              lastError: null,
              metadataJson: result.raw as object | undefined,
            },
          });
          logEvent(LOG_EVENTS.PROVIDER_ORDER_CREATED, {
            creditId: credit.id,
            resourceType: spec.resourceType,
            providerOrderId: result.providerOrderId,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await prisma.providerOrder.update({
            where: { id: orderRow.id },
            data: {
              status: "FAILED",
              failedAt: new Date(),
              lastError: message,
            },
          });
          logEvent(LOG_EVENTS.PROVIDER_FAILED, {
            creditId: credit.id,
            resourceType: spec.resourceType,
            error: message,
          });
        }
      }
    }

    await markWorkerRun(WORKER_NAME, { ok: true, error: null });
    return { processed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      service: "worker",
      event: "PROVISIONING_FAILED",
      error: message,
    });
    await markWorkerRun(WORKER_NAME, { ok: false, error: message });
    throw err;
  }
}

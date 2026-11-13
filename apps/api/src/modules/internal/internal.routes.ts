import type { FastifyPluginAsync } from "fastify";
import { getEnv } from "../../config/index.js";
import { runTrxDepositMonitorOnce } from "../../workers/trx-deposit-monitor.js";
import { runTrxConfirmationOnce } from "../../workers/trx-confirmation.js";
import { runSponsorshipProvisioningOnce } from "../../workers/sponsorship-provisioning.js";
import { runGetGasOrderStatusOnce } from "../../workers/getgas-order-status.js";

function authorizeInternal(
  request: { headers: Record<string, unknown> },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): boolean {
  const secret = getEnv().INTERNAL_API_SECRET;
  if (!secret) {
    void reply.status(503).send({ error: "INTERNAL_API_SECRET not configured" });
    return false;
  }
  const header = String(request.headers["x-internal-secret"] ?? "");
  if (header !== secret) {
    void reply.status(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * Ops-only endpoints. Sponsorships cannot be created from the public API —
 * only verified chain deposits create credits.
 */
export const internalRoutes: FastifyPluginAsync = async (app) => {
  app.post("/internal/deposits/process", async (request, reply) => {
    if (!authorizeInternal(request, reply)) return;
    const result = await runTrxDepositMonitorOnce();
    return { ok: true, ...result };
  });

  app.post("/internal/sponsorships/process", async (request, reply) => {
    if (!authorizeInternal(request, reply)) return;
    const confirm = await runTrxConfirmationOnce();
    const provision = await runSponsorshipProvisioningOnce();
    return { ok: true, confirm, provision };
  });

  app.post("/internal/provider-orders/sync", async (request, reply) => {
    if (!authorizeInternal(request, reply)) return;
    const result = await runGetGasOrderStatusOnce();
    return { ok: true, ...result };
  });
};

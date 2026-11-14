import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../../config/index.js";

/**
 * GetGas order lifecycle is driven by polling GET /orders/{id}
 * (see https://getgas.io/developers/docs). This endpoint acknowledges
 * official webhook delivery; it does not invent order updates.
 *
 * Accept both `/webhooks/getgas` (canonical) and `/webhook` (path often
 * pasted from the GetGas dashboard without the full suffix).
 */
export const webhookRoutes: FastifyPluginAsync = async (app) => {
  async function acknowledge(request: FastifyRequest, reply: FastifyReply) {
    const secret = getEnv().GETGAS_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        (request.headers["x-webhook-secret"] as string | undefined) ?? "";
      if (provided !== secret) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }

    // Acknowledge only — status worker remains the source of truth via polling
    return reply.status(202).send({
      accepted: true,
      message:
        "Webhook acknowledged. Order status is reconciled by the GetGas polling worker.",
    });
  }

  app.post("/webhooks/getgas", acknowledge);
  app.post("/webhook", acknowledge);
};

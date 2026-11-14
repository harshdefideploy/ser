import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "../../config/index.js";

/**
 * GetGas order lifecycle is driven by polling GET /orders/{id}
 * (see https://getgas.io/developers/docs). This endpoint acknowledges
 * official webhook delivery; it does not invent order updates.
 *
 * Accept both `/webhooks/getgas` (canonical) and `/webhook` (path often
 * pasted from the GetGas dashboard without the full suffix).
 *
 * Auth: GetGas signs with HMAC-SHA256 —
 * `X-GetGas-Signature: t=<unix>,v1=<hex>` over `${t}.${rawBody}` using
 * the dashboard `whsec_...` secret. Also accept legacy `x-webhook-secret`
 * for manual curl checks.
 */
function verifyGetGasSignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const i = part.indexOf("=");
      return i === -1
        ? [part.trim(), ""]
        : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
    }),
  ) as { t?: string; v1?: string };
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(ageSec) || ageSec > 300) return false;
  const expected = createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Preserve raw body for HMAC verification (GetGas signs the exact bytes).
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      const raw = typeof body === "string" ? body : body.toString("utf8");
      (req as FastifyRequest & { rawBody?: string }).rawBody = raw;
      try {
        done(null, raw.length ? JSON.parse(raw) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  async function acknowledge(request: FastifyRequest, reply: FastifyReply) {
    const secret = getEnv().GETGAS_WEBHOOK_SECRET;
    if (secret) {
      const legacy =
        (request.headers["x-webhook-secret"] as string | undefined) ?? "";
      const sigHeader =
        (request.headers["x-getgas-signature"] as string | undefined) ?? "";
      const rawBody =
        (request as FastifyRequest & { rawBody?: string }).rawBody ??
        JSON.stringify(request.body ?? {});

      const ok =
        (legacy && legacy === secret) ||
        verifyGetGasSignature(rawBody, sigHeader, secret);

      if (!ok) {
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

import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { getEnv } from "./config/index.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { webhookRoutes } from "./modules/webhooks/webhook.routes.js";
import { internalRoutes } from "./modules/internal/internal.routes.js";
import { logger } from "./lib/logger.js";

export async function buildApp() {
  const env = getEnv();

  const app = Fastify({
    logger: false,
    trustProxy: true,
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: env.WEB_URL,
    credentials: true,
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);
  await app.register(webhookRoutes);
  await app.register(internalRoutes);

  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    logger.error({
      service: "api",
      event: "UNHANDLED_ERROR",
      err: {
        message: error.message,
        statusCode,
      },
      path: request.url,
    });

    reply.status(statusCode).send({
      error:
        statusCode >= 500
          ? "Internal server error"
          : error.message || "Request failed",
    });
  });

  return app;
}

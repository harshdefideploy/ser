import type { FastifyPluginAsync } from "fastify";
import { checkDatabaseHealth, prisma } from "@tron-gas-sponsor/database";
import type { HealthCheckResult } from "@tron-gas-sponsor/shared";
import { getEnv } from "../../config/index.js";
import { TronGridClient } from "../tron/trongrid.client.js";
import { GetGasProvider } from "../provider/getgas.service.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => {
    const env = getEnv();
    const db = await checkDatabaseHealth();

    const trongrid = new TronGridClient();
    const tronProbe = await trongrid.probe();

    const getgas = new GetGasProvider();
    const gasProbe = await getgas.probe();

    const workers = await prisma.workerState.findMany();
    const workersOk =
      workers.length === 0 || workers.every((w: { isHealthy: boolean }) => w.isHealthy);

    const degraded =
      !tronProbe.ok ||
      (env.GETGAS_API_KEY ? !gasProbe.ok : false) ||
      !workersOk;

    const result: HealthCheckResult = {
      status: !db.ok ? "down" : degraded ? "degraded" : "ok",
      checks: {
        database: {
          status: db.ok ? "ok" : "down",
          latencyMs: db.latencyMs,
          message: db.message,
        },
        tronRpc: {
          status: tronProbe.ok ? "ok" : "degraded",
          latencyMs: tronProbe.latencyMs,
          message: tronProbe.message,
        },
        getGas: {
          status: !env.GETGAS_API_KEY
            ? "skipped"
            : gasProbe.ok
              ? "ok"
              : "degraded",
          latencyMs: gasProbe.latencyMs,
          message: gasProbe.message,
        },
        workers: {
          status: workersOk ? "ok" : "degraded",
          message:
            workers.length === 0
              ? "No worker state rows"
              : `${workers.filter((w: { isHealthy: boolean }) => w.isHealthy).length}/${workers.length} healthy`,
        },
      },
      timestamp: new Date().toISOString(),
      network: env.TRON_NETWORK,
      appEnv: env.APP_ENV,
    };

    return result;
  });

  app.get("/ready", async (_request, reply) => {
    const db = await checkDatabaseHealth();
    if (!db.ok) {
      return reply.status(503).send({
        ready: false,
        database: false,
        message: db.message,
      });
    }
    return { ready: true, database: true };
  });
};

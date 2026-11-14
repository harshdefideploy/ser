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
    // Critical pipeline workers must have run recently (embedded or standalone).
    const critical = new Set([
      "trx-deposit-monitor",
      "trx-confirmation",
      "sponsorship-provisioning",
      "getgas-order-status",
    ]);
    const staleMs = Math.max(
      60_000,
      (Number(process.env.TRONGRID_POLL_INTERVAL) || 6_000) * 10,
    );
    const now = Date.now();
    const freshCritical = workers.filter((w: {
      workerName: string;
      isHealthy: boolean;
      lastRunAt: Date | null;
    }) => {
      if (!critical.has(w.workerName)) return true;
      if (!w.isHealthy || !w.lastRunAt) return false;
      return now - new Date(w.lastRunAt).getTime() <= staleMs;
    });
    const workersOk =
      workers.length > 0 &&
      critical.size <=
        workers.filter((w: { workerName: string }) => critical.has(w.workerName))
          .length &&
      freshCritical.length === workers.length;

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
              ? "No worker state rows — auto top-up not running"
              : workersOk
                ? `${workers.filter((w: { isHealthy: boolean }) => w.isHealthy).length}/${workers.length} healthy`
                : `Stale/unhealthy workers — auto top-up may be stopped (${freshCritical.filter((w: { workerName: string }) => critical.has(w.workerName)).length}/${critical.size} critical fresh)`,
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

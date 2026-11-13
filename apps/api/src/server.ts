import { buildApp } from "./app.js";
import { getEnv } from "./config/index.js";
import { logger } from "./lib/logger.js";

async function main() {
  const env = getEnv();
  const app = await buildApp();

  try {
    // Prefer platform PORT (Voroa/Render/etc), else API_PORT
    const port = Number(process.env.PORT) || env.API_PORT;
    await app.listen({ port, host: "0.0.0.0" });
    logger.info({
      service: "api",
      event: "SERVER_STARTED",
      port,
      network: env.TRON_NETWORK,
      appEnv: env.APP_ENV,
      phase: 1,
    });
  } catch (err) {
    logger.error({
      service: "api",
      event: "SERVER_START_FAILED",
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void main();

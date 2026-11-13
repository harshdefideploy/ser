import { loadEnv, type AppEnv } from "@tron-gas-sponsor/config";
import { loadDotenv } from "../lib/load-dotenv.js";

export type { AppEnv };

let env: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!env) {
    loadDotenv();
    env = loadEnv();
  }
  return env;
}

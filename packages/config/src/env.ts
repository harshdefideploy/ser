import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1),

  TRON_NETWORK: z.enum(["mainnet", "shasta", "nile"]).default("mainnet"),
  TRON_RPC_URL: z.string().url().default("https://api.trongrid.io"),
  TRONGRID_API_KEY: z.string().optional().default(""),

  MASTER_TRON_ADDRESS: z.string().optional().default(""),

  /** Preferred name; falls back from MIN_QUALIFYING_TRX via preprocess below */
  MIN_TRX_DEPOSIT: z.coerce.number().positive().default(1),
  ENERGY_TARGET: z.coerce.number().int().positive().default(150_000),
  BANDWIDTH_TARGET: z.coerce.number().int().positive().default(1_000),
  PROVIDER_ORDER_MAX_RETRIES: z.coerce.number().int().positive().default(5),
  CONFIRMATIONS_REQUIRED: z.coerce.number().int().positive().default(20),
  /** Alias: TRON_CONFIRMATIONS */
  TRON_CONFIRMATIONS: z.coerce.number().int().positive().optional(),
  SPONSORSHIP_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  /** Alias: SPONSORSHIP_EXPIRY (hours) */
  SPONSORSHIP_EXPIRY: z.coerce.number().int().positive().optional(),

  DAILY_PROVIDER_LIMIT_TRX: z.coerce.number().positive().default(1000),
  MONTHLY_PROVIDER_LIMIT_TRX: z.coerce.number().positive().default(20_000),
  /** Aliases for spend limits */
  DAILY_PROVIDER_SPEND_LIMIT: z.coerce.number().positive().optional(),
  MONTHLY_PROVIDER_SPEND_LIMIT: z.coerce.number().positive().optional(),
  MAX_ACTIVE_SPONSORSHIPS: z.coerce.number().int().positive().default(500),

  MAX_CREDITS_PER_WALLET_PER_DAY: z.coerce.number().int().positive().default(10),
  MAX_SPONSORSHIPS_PER_IP_PER_DAY: z.coerce
    .number()
    .int()
    .positive()
    .default(50),
  MAX_GLOBAL_SPONSORSHIPS_PER_DAY: z.coerce
    .number()
    .int()
    .positive()
    .default(2000),

  /** Preferred poll interval name; default 6000ms */
  TRONGRID_POLL_INTERVAL: z.coerce.number().int().positive().default(6_000),
  /** Legacy alias */
  MONITOR_INTERVAL_MS: z.coerce.number().int().positive().optional(),

  GETGAS_API_KEY: z.string().optional().default(""),
  GETGAS_API_BASE_URL: z.string().url().default("https://getgas.io/api/v1"),
  GETGAS_WEBHOOK_SECRET: z.string().optional().default(""),
  GETGAS_PROVIDER_TERM: z.enum(["15m", "1h"]).default("1h"),
  INTERNAL_API_SECRET: z.string().optional().default(""),

  // Empty string on platforms (write-only re-save) fails .email() — treat as unset.
  ADMIN_EMAIL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().default("admin@example.com"),
  ),
  ADMIN_PASSWORD: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(8).default("ChangeMeSecurely123!"),
  ),

  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z
    .string()
    .length(64)
    .regex(/^[0-9a-fA-F]+$/, "ENCRYPTION_KEY must be 64 hex characters"),

  WEB_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://localhost:4000"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_PORT: z.coerce.number().int().positive().default(3000),

  WORKER_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false" && v !== "0"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

function normalizeEnvInput(
  env: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...env };
  // MIN_TRX_DEPOSIT preferred; accept legacy MIN_QUALIFYING_TRX
  if (!out.MIN_TRX_DEPOSIT && out.MIN_QUALIFYING_TRX) {
    out.MIN_TRX_DEPOSIT = out.MIN_QUALIFYING_TRX;
  }
  // TRONGRID_POLL_INTERVAL preferred; accept MONITOR_INTERVAL_MS
  if (!out.TRONGRID_POLL_INTERVAL && out.MONITOR_INTERVAL_MS) {
    out.TRONGRID_POLL_INTERVAL = out.MONITOR_INTERVAL_MS;
  }
  if (out.TRON_CONFIRMATIONS && !out.CONFIRMATIONS_REQUIRED) {
    out.CONFIRMATIONS_REQUIRED = out.TRON_CONFIRMATIONS;
  }
  if (out.SPONSORSHIP_EXPIRY && !out.SPONSORSHIP_EXPIRY_HOURS) {
    out.SPONSORSHIP_EXPIRY_HOURS = out.SPONSORSHIP_EXPIRY;
  }
  if (out.DAILY_PROVIDER_SPEND_LIMIT && !out.DAILY_PROVIDER_LIMIT_TRX) {
    out.DAILY_PROVIDER_LIMIT_TRX = out.DAILY_PROVIDER_SPEND_LIMIT;
  }
  if (out.MONTHLY_PROVIDER_SPEND_LIMIT && !out.MONTHLY_PROVIDER_LIMIT_TRX) {
    out.MONTHLY_PROVIDER_LIMIT_TRX = out.MONTHLY_PROVIDER_SPEND_LIMIT;
  }
  return out;
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(normalizeEnvInput(env));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  cached = parsed.data;

  // CORS Origin must match browser Origin exactly (no trailing slash).
  cached.WEB_URL = cached.WEB_URL.replace(/\/$/, "");
  cached.API_URL = cached.API_URL.replace(/\/$/, "");

  // Resolve aliases into canonical fields used by the app
  if (cached.TRON_CONFIRMATIONS) {
    cached.CONFIRMATIONS_REQUIRED = cached.TRON_CONFIRMATIONS;
  }
  if (cached.SPONSORSHIP_EXPIRY) {
    cached.SPONSORSHIP_EXPIRY_HOURS = cached.SPONSORSHIP_EXPIRY;
  }
  if (cached.DAILY_PROVIDER_SPEND_LIMIT) {
    cached.DAILY_PROVIDER_LIMIT_TRX = cached.DAILY_PROVIDER_SPEND_LIMIT;
  }
  if (cached.MONTHLY_PROVIDER_SPEND_LIMIT) {
    cached.MONTHLY_PROVIDER_LIMIT_TRX = cached.MONTHLY_PROVIDER_SPEND_LIMIT;
  }
  if (cached.MONITOR_INTERVAL_MS && !env.TRONGRID_POLL_INTERVAL) {
    cached.TRONGRID_POLL_INTERVAL = cached.MONITOR_INTERVAL_MS;
  }

  if (
    cached.TRON_NETWORK === "mainnet" &&
    cached.APP_ENV === "development" &&
    cached.NODE_ENV !== "production"
  ) {
    console.warn(
      "[config] APP_ENV=development with TRON_NETWORK=mainnet. Use shasta/nile for test mode.",
    );
  }

  return cached;
}

/** Reset cache — for tests only */
export function resetEnvCache(): void {
  cached = null;
}

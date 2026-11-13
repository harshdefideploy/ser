import pino from "pino";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "apiKey",
  "apitoken",
  "authorization",
  "cookie",
  "token",
  "secret",
  "privateKey",
  "seed",
  "mnemonic",
  "encryptionKey",
  "jwt",
]);

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase()) || /secret|password|key|token|seed/i.test(k)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redact(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "apiKey",
      "GETGAS_API_KEY",
      "JWT_SECRET",
      "COOKIE_SECRET",
      "ENCRYPTION_KEY",
    ],
    censor: "[REDACTED]",
  },
});

export function logEvent(
  event: string,
  fields: Record<string, unknown> = {},
): void {
  logger.info({
    service: "api",
    event,
    ...redact(fields),
  });
}

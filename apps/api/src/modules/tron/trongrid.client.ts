import { getEnv } from "../../config/index.js";
import { logEvent, logger } from "../../lib/logger.js";

export class TronGridError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable = false,
  ) {
    super(message);
    this.name = "TronGridError";
  }
}

export interface TronGridTxPage {
  data: unknown[];
  success: boolean;
  meta?: {
    fingerprint?: string;
    page_size?: number;
    links?: { next?: string };
  };
}

export interface NowBlockInfo {
  blockNumber: number;
  blockTimestampMs: number;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class TronGridClient {
  constructor(
    private readonly baseUrl = getEnv().TRON_RPC_URL.replace(/\/$/, ""),
    private readonly apiKey = getEnv().TRONGRID_API_KEY,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      h["TRON-PRO-API-KEY"] = this.apiKey;
    }
    return h;
  }

  async requestJson<T>(
    pathOrUrl: string,
    init?: RequestInit,
    attempt = 0,
  ): Promise<T> {
    const url = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `${this.baseUrl}${pathOrUrl}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          ...this.headers(),
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      });

      if (res.status === 429 || res.status === 403) {
        const retryable = true;
        const backoff = Math.min(60_000, 1000 * 2 ** attempt);
        logEvent("TRONGRID_RATE_LIMIT", {
          status: res.status,
          attempt,
          backoffMs: backoff,
        });
        if (attempt >= 6) {
          throw new TronGridError(
            `TronGrid rate limited (${res.status})`,
            res.status,
            retryable,
          );
        }
        await sleep(backoff);
        return this.requestJson<T>(pathOrUrl, init, attempt + 1);
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new TronGridError(
          `TronGrid HTTP ${res.status}: ${body.slice(0, 200)}`,
          res.status,
          res.status >= 500,
        );
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof TronGridError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      const retryable =
        message.includes("abort") ||
        message.includes("timeout") ||
        message.includes("fetch");
      if (retryable && attempt < 5) {
        const backoff = Math.min(30_000, 500 * 2 ** attempt);
        logger.warn({
          service: "trongrid",
          event: "TRONGRID_RETRY",
          attempt,
          backoffMs: backoff,
          error: message,
        });
        await sleep(backoff);
        return this.requestJson<T>(pathOrUrl, init, attempt + 1);
      }
      throw new TronGridError(message, undefined, retryable);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Official TronGrid V1: GET /v1/accounts/{address}/transactions
   * Prefer only_to=true for master-wallet inbound monitoring.
   */
  async getAccountTransactions(params: {
    address: string;
    onlyTo?: boolean;
    onlyFrom?: boolean;
    onlyConfirmed?: boolean;
    limit?: number;
    fingerprint?: string;
    minTimestamp?: number;
    orderBy?: string;
  }): Promise<TronGridTxPage> {
    const q = new URLSearchParams();
    if (params.onlyTo) q.set("only_to", "true");
    if (params.onlyFrom) q.set("only_from", "true");
    if (params.onlyConfirmed) q.set("only_confirmed", "true");
    q.set("limit", String(params.limit ?? 50));
    q.set("order_by", params.orderBy ?? "block_timestamp,asc");
    if (params.minTimestamp !== undefined) {
      q.set("min_timestamp", String(params.minTimestamp));
    }
    if (params.fingerprint) q.set("fingerprint", params.fingerprint);

    return this.requestJson<TronGridTxPage>(
      `/v1/accounts/${encodeURIComponent(params.address)}/transactions?${q}`,
    );
  }

  async getNowBlock(): Promise<NowBlockInfo> {
    const body = await this.requestJson<{
      block_header?: {
        raw_data?: { number?: number; timestamp?: number };
      };
    }>("/wallet/getnowblock", { method: "POST", body: "{}" });

    const number = body.block_header?.raw_data?.number;
    const timestamp = body.block_header?.raw_data?.timestamp;
    if (typeof number !== "number") {
      throw new TronGridError("getnowblock missing block number");
    }
    return {
      blockNumber: number,
      blockTimestampMs: typeof timestamp === "number" ? timestamp : Date.now(),
    };
  }

  async probe(): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
    const start = Date.now();
    try {
      await this.getNowBlock();
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : "TronGrid unreachable",
      };
    }
  }
}

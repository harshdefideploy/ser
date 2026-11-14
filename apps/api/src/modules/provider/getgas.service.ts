import { getEnv } from "../../config/index.js";
import { logEvent, logger } from "../../lib/logger.js";
import type { ResourceProvider } from "./provider.interface.js";
import type {
  CreateBandwidthOrderInput,
  CreateEnergyOrderInput,
  ProviderBalance,
  ProviderOrderResult,
  ProviderOrderStatusResult,
  ProviderWebhookPayload,
} from "./provider.types.js";

type GetGasOrder = {
  id: number | string;
  status: string;
  resource?: string;
  address?: string;
  volume?: number;
  term?: string;
  priceSun?: number;
  priceTrx?: string;
  txId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type GetGasAccount = {
  balanceSun?: number;
  balanceTrx?: string;
  email?: string;
};

function mapStatus(
  status: string,
): ProviderOrderResult["status"] {
  const s = status.toLowerCase();
  if (s === "filled" || s === "completed" || s === "active") return "FILLED";
  if (s === "submitted" || s === "processing" || s === "pending") {
    return s === "pending" ? "PENDING" : "SUBMITTED";
  }
  if (s === "refunded" || s === "failed" || s === "cancelled") return "FAILED";
  return "SUBMITTED";
}

/**
 * GetGas provider — official API https://getgas.io/developers/docs
 * Base URL: https://getgas.io/api/v1
 *
 * NEVER inspect end-user Energy/Bandwidth. Order amounts come from
 * planFixedSponsorshipOrders() only.
 */
export class GetGasProvider implements ResourceProvider {
  readonly name = "getgas";

  constructor(
    private readonly baseUrl = getEnv().GETGAS_API_BASE_URL.replace(/\/$/, ""),
    private readonly apiKey = getEnv().GETGAS_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers(idempotencyKey?: string): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (idempotencyKey) {
      h["Idempotency-Key"] = idempotencyKey;
    }
    return h;
  }

  private async request<T>(
    path: string,
    init?: RequestInit & { idempotencyKey?: string },
    attempt = 0,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error("GETGAS_API_KEY is not configured");
    }

    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await this.fetchImpl(url, {
        ...init,
        headers: {
          ...this.headers(init?.idempotencyKey),
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      });

      if (res.status === 429 && attempt < 5) {
        const backoff = Math.min(30_000, 1000 * 2 ** attempt);
        logEvent("GETGAS_RATE_LIMIT", { attempt, backoffMs: backoff });
        await new Promise((r) => setTimeout(r, backoff));
        return this.request<T>(path, init, attempt + 1);
      }

      const json = (await res.json().catch(() => ({}))) as {
        data?: T;
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        const detail =
          typeof json.error === "string"
            ? json.error
            : json.error != null
              ? JSON.stringify(json.error)
              : typeof json.message === "string"
                ? json.message
                : `GetGas HTTP ${res.status}`;
        throw new Error(detail);
      }

      return (json.data ?? json) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async createOrder(
    resource: "energy" | "bandwidth",
    input: { walletAddress: string; amount: number; idempotencyKey: string; durationHours?: number },
  ): Promise<ProviderOrderResult> {
    const term =
      input.durationHours !== undefined && input.durationHours <= 0.3
        ? "15m"
        : getEnv().GETGAS_PROVIDER_TERM;

    const order = await this.request<GetGasOrder>(
      "/orders",
      {
        method: "POST",
        idempotencyKey: input.idempotencyKey,
        body: JSON.stringify({
          resource,
          address: input.walletAddress,
          volume: input.amount,
          term,
        }),
      },
    );

    logEvent("PROVIDER_ORDER_CREATED", {
      provider: this.name,
      providerOrderId: String(order.id),
      resource,
      amount: input.amount,
      status: order.status,
    });

    return {
      providerOrderId: String(order.id),
      status: mapStatus(order.status),
      requestedAmount: input.amount,
      deliveredAmount:
        mapStatus(order.status) === "FILLED" ? order.volume : undefined,
      costTrx: order.priceTrx ? Number(order.priceTrx) : undefined,
      costUsd: undefined,
      raw: order,
    };
  }

  createEnergyOrder(input: CreateEnergyOrderInput): Promise<ProviderOrderResult> {
    return this.createOrder("energy", input);
  }

  createBandwidthOrder(
    input: CreateBandwidthOrderInput,
  ): Promise<ProviderOrderResult> {
    return this.createOrder("bandwidth", input);
  }

  async getOrderStatus(
    providerOrderId: string,
  ): Promise<ProviderOrderStatusResult> {
    const order = await this.request<GetGasOrder>(
      `/orders/${encodeURIComponent(providerOrderId)}`,
    );
    return {
      providerOrderId: String(order.id),
      status:
        mapStatus(order.status) === "FILLED"
          ? "FILLED"
          : mapStatus(order.status) === "FAILED"
            ? "FAILED"
            : mapStatus(order.status) === "PENDING"
              ? "PENDING"
              : "SUBMITTED",
      deliveredAmount: order.volume,
      costTrx: order.priceTrx ? Number(order.priceTrx) : undefined,
    };
  }

  async getBalance(): Promise<ProviderBalance> {
    const account = await this.request<GetGasAccount>("/account");
    return {
      trx: account.balanceTrx ? Number(account.balanceTrx) : undefined,
      raw: account,
    };
  }

  async probe(): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        ok: false,
        latencyMs: 0,
        message: "GETGAS_API_KEY not configured",
      };
    }
    try {
      await this.getBalance();
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : "GetGas unreachable",
      };
    }
  }

  handleWebhook(_payload: ProviderWebhookPayload): Promise<void> {
    // Official docs emphasize polling GET /orders/{id}; webhook reserved.
    logger.info({
      service: "getgas",
      event: "WEBHOOK_IGNORED",
      message: "Prefer order status polling per GetGas docs",
    });
    return Promise.resolve();
  }
}

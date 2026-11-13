import { describe, expect, it, vi } from "vitest";
import { GetGasProvider } from "./getgas.service.js";

vi.mock("../../config/index.js", () => ({
  getEnv: () => ({
    GETGAS_API_KEY: "test-key",
    GETGAS_API_BASE_URL: "https://getgas.io/api/v1",
    GETGAS_PROVIDER_TERM: "1h",
  }),
}));

vi.mock("../../lib/logger.js", () => ({
  logEvent: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("GetGasProvider", () => {
  it("creates energy order with full volume and idempotency key", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        data: {
          id: 42,
          status: "submitted",
          resource: "energy",
          volume: 150000,
          priceTrx: "2.5",
        },
      }),
    })) as unknown as typeof fetch;

    const provider = new GetGasProvider(
      "https://getgas.io/api/v1",
      "test-key",
      fetchImpl,
    );

    const result = await provider.createEnergyOrder({
      walletAddress: "TXYZ",
      amount: 150000,
      idempotencyKey: "credit1-ENERGY",
    });

    expect(result.providerOrderId).toBe("42");
    expect(result.status).toBe("SUBMITTED");
    expect(result.requestedAmount).toBe(150000);

    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      "Idempotency-Key": "credit1-ENERGY",
      Authorization: "Bearer test-key",
    });
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({
      resource: "energy",
      address: "TXYZ",
      volume: 150000,
      term: "1h",
    });
  });

  it("maps filled status from getOrderStatus", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 42,
          status: "filled",
          volume: 1000,
          priceTrx: "0.1",
        },
      }),
    })) as unknown as typeof fetch;

    const provider = new GetGasProvider(
      "https://getgas.io/api/v1",
      "test-key",
      fetchImpl,
    );
    const status = await provider.getOrderStatus("42");
    expect(status.status).toBe("FILLED");
  });

  it("idempotent replay returns same logical order payload", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 99,
          status: "submitted",
          volume: 150000,
          priceTrx: "2.5",
        },
      }),
    })) as unknown as typeof fetch;

    const provider = new GetGasProvider(
      "https://getgas.io/api/v1",
      "test-key",
      fetchImpl,
    );

    const a = await provider.createEnergyOrder({
      walletAddress: "TXYZ",
      amount: 150000,
      idempotencyKey: "same-key-ENERGY",
    });
    const b = await provider.createEnergyOrder({
      walletAddress: "TXYZ",
      amount: 150000,
      idempotencyKey: "same-key-ENERGY",
    });
    expect(a.providerOrderId).toBe(b.providerOrderId);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();
const create = vi.fn();
const transaction = vi.fn();

const masterFindFirst = vi.fn();

vi.mock("@tron-gas-sponsor/database", () => ({
  prisma: {
    tRXDeposit: { findUnique },
    masterWallet: { findFirst: masterFindFirst },
    $transaction: transaction,
  },
}));

vi.mock("../../services/settings.service.js", () => ({
  getSystemSettings: vi.fn(async () => ({
    masterWalletAddress: "TMasterAddressXXXXXXXXXXXXXXXXXXX",
    minimumQualifyingTrx: "1",
  })),
}));

vi.mock("../../config/index.js", () => ({
  getEnv: () => ({
    TRON_NETWORK: "shasta",
    MASTER_TRON_ADDRESS: "TMasterAddressXXXXXXXXXXXXXXXXXXX",
  }),
}));

vi.mock("../../lib/logger.js", () => ({
  logEvent: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Bypass real Base58 validation for unit test addresses
vi.mock("./tron.address.js", async () => {
  return {
    isValidTronAddress: () => true,
    normalizeTronAddress: (a: string) => a,
    hexToTronBase58: (a: string) => a,
  };
});

describe("recordIncomingDeposit", () => {
  beforeEach(() => {
    vi.resetModules();
    findUnique.mockReset();
    upsert.mockReset();
    create.mockReset();
    transaction.mockReset();
    masterFindFirst.mockReset();
  });

  it("skips duplicate txid", async () => {
    findUnique.mockResolvedValue({ id: "dep1" });
    const { recordIncomingDeposit } = await import("./deposit.service.js");
    const result = await recordIncomingDeposit({
      txid: "ABC123",
      fromAddress: "TUser",
      toAddress: "TMasterAddressXXXXXXXXXXXXXXXXXXX",
      amountTrx: 1,
      amountSun: 1_000_000,
      blockNumber: 1,
      blockTimestampMs: 1,
      confirmedHint: true,
    });
    expect(result).toEqual({
      created: false,
      skippedReason: "duplicate_txid",
      depositId: "dep1",
    });
  });

  it("skips below minimum", async () => {
    findUnique.mockResolvedValue(null);
    const { recordIncomingDeposit } = await import("./deposit.service.js");
    const result = await recordIncomingDeposit({
      txid: "ABC124",
      fromAddress: "TUser",
      toAddress: "TMasterAddressXXXXXXXXXXXXXXXXXXX",
      amountTrx: 0.1,
      amountSun: 100_000,
      blockNumber: 1,
      blockTimestampMs: 1,
      confirmedHint: true,
    });
    expect(result.created).toBe(false);
    expect(result.skippedReason).toBe("below_minimum");
  });

  it("creates deposit once for qualifying inbound TRX", async () => {
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({ id: "w1" });
    create.mockResolvedValue({ id: "dep-new" });
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        wallet: { upsert },
        tRXDeposit: { create },
      }),
    );

    // Patch settings master to a short test value used above
    const settings = await import("../../services/settings.service.js");
    vi.mocked(settings.getSystemSettings).mockResolvedValue({
      masterWalletAddress: "TMasterAddressXXXXXXXXXXXXXXXXXXX",
      minimumQualifyingTrx: "1",
      energyTarget: 150000,
      bandwidthTarget: 1000,
      sponsorshipExpiryHours: 24,
      confirmationsRequired: 20,
      providerName: "getgas",
      monitorIntervalMs: 6000,
      dailyProviderLimitTrx: "1000",
      monthlyProviderLimitTrx: "20000",
      maxActiveSponsorships: 500,
      maxCreditsPerWalletPerDay: 10,
      maxSponsorshipsPerIpPerDay: 50,
      maxGlobalSponsorshipsPerDay: 2000,
      providerOrderMaxRetries: 5,
      providerTerm: "1h",
    });

    const { recordIncomingDeposit } = await import("./deposit.service.js");
    const result = await recordIncomingDeposit(
      {
        txid: "ABC123",
        fromAddress: "TUser",
        toAddress: "TMasterAddressXXXXXXXXXXXXXXXXXXX",
        amountTrx: 1,
        amountSun: 1_000_000,
        blockNumber: 10,
        blockTimestampMs: 1000,
        confirmedHint: true,
      },
      {
        masterWalletId: "mw-1",
        masterAddress: "TMasterAddressXXXXXXXXXXXXXXXXXXX",
        network: "shasta",
      },
    );
    expect(result.created).toBe(true);
    expect(result.depositId).toBe("dep-new");
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          masterWalletId: "mw-1",
          txid: "ABC123",
        }),
      }),
    );
  });
});

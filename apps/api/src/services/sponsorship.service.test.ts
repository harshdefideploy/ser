import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const count = vi.fn();
const createCredit = vi.fn();
const updateDeposit = vi.fn();
const createAudit = vi.fn();
const blacklistFindFirst = vi.fn();
const transaction = vi.fn();

vi.mock("@tron-gas-sponsor/database", () => ({
  prisma: {
    $transaction: transaction,
  },
}));

vi.mock("./settings.service.js", () => ({
  getSystemSettings: vi.fn(async () => ({
    energyTarget: 150000,
    bandwidthTarget: 1000,
    sponsorshipExpiryHours: 24,
    maxCreditsPerWalletPerDay: 10,
    confirmationsRequired: 20,
  })),
}));

vi.mock("../lib/logger.js", () => ({
  logEvent: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../modules/tron/tron.address.js", () => ({
  normalizeTronAddress: (a: string) => a,
  isValidTronAddress: () => true,
}));

describe("confirmDepositAndCreateCredit", () => {
  beforeEach(() => {
    vi.resetModules();
    findUnique.mockReset();
    count.mockReset();
    createCredit.mockReset();
    updateDeposit.mockReset();
    createAudit.mockReset();
    blacklistFindFirst.mockReset();
    transaction.mockReset();
  });

  function mockTx() {
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        tRXDeposit: { findUnique, update: updateDeposit },
        sponsorshipCredit: { count, create: createCredit },
        auditLog: { create: createAudit },
        blacklistedWallet: { findFirst: blacklistFindFirst },
      }),
    );
  }

  it("creates exactly one credit for a non-blacklisted confirmed deposit", async () => {
    findUnique.mockResolvedValue({
      id: "dep1",
      walletId: "w1",
      txid: "ABC123",
      fromAddress: "TUserGood",
      status: "WAITING_CONFIRMATIONS",
      confirmedAt: null,
      credit: null,
      rejectionReason: null,
    });
    blacklistFindFirst.mockResolvedValue(null);
    count.mockResolvedValue(0);
    createCredit.mockResolvedValue({
      id: "credit1",
      energyTarget: 150000,
      bandwidthTarget: 1000,
    });
    updateDeposit.mockResolvedValue({});
    mockTx();

    const { confirmDepositAndCreateCredit } = await import(
      "./sponsorship.service.js"
    );
    const first = await confirmDepositAndCreateCredit("dep1", 20);
    expect(first.confirmed).toBe(true);
    expect(first.creditId).toBe("credit1");
    expect(createCredit).toHaveBeenCalledTimes(1);
    expect(createCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          energyTarget: 150000,
          bandwidthTarget: 1000,
        }),
      }),
    );
  });

  it("blacklisted sender → no SponsorshipCredit", async () => {
    findUnique.mockResolvedValue({
      id: "dep1",
      walletId: "w1",
      txid: "ABC_BLOCKED",
      fromAddress: "TUserBad",
      status: "WAITING_CONFIRMATIONS",
      confirmedAt: null,
      credit: null,
      rejectionReason: null,
    });
    blacklistFindFirst.mockResolvedValue({ id: "bl1" });
    updateDeposit.mockResolvedValue({});
    createAudit.mockResolvedValue({});
    mockTx();

    const { confirmDepositAndCreateCredit } = await import(
      "./sponsorship.service.js"
    );
    const result = await confirmDepositAndCreateCredit("dep1", 20);
    expect(result.confirmed).toBe(false);
    expect(result.skippedReason).toBe("blacklisted_sender");
    expect(createCredit).not.toHaveBeenCalled();
    expect(updateDeposit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionReason: "BLACKLISTED_SENDER",
        }),
      }),
    );
  });

  it("blacklisted sender → no GetGas order path (no credit created)", async () => {
    findUnique.mockResolvedValue({
      id: "dep2",
      walletId: "w1",
      txid: "ABC_BLOCKED2",
      fromAddress: "TUserBad",
      status: "WAITING_CONFIRMATIONS",
      credit: null,
      rejectionReason: null,
    });
    blacklistFindFirst.mockResolvedValue({ id: "bl1" });
    updateDeposit.mockResolvedValue({});
    createAudit.mockResolvedValue({});
    mockTx();

    const { confirmDepositAndCreateCredit } = await import(
      "./sponsorship.service.js"
    );
    await confirmDepositAndCreateCredit("dep2", 25);
    expect(createCredit).not.toHaveBeenCalled();
  });

  it("duplicate blacklisted TXID remains blocked (no retroactive credit)", async () => {
    findUnique.mockResolvedValue({
      id: "dep1",
      walletId: "w1",
      txid: "ABC_BLOCKED",
      fromAddress: "TUserBad",
      status: "REJECTED",
      rejectionReason: "BLACKLISTED_SENDER",
      credit: null,
    });
    mockTx();

    const { confirmDepositAndCreateCredit } = await import(
      "./sponsorship.service.js"
    );
    const again = await confirmDepositAndCreateCredit("dep1", 30);
    expect(again.confirmed).toBe(false);
    expect(again.skippedReason).toBe("blacklisted_sender");
    expect(createCredit).not.toHaveBeenCalled();
    expect(blacklistFindFirst).not.toHaveBeenCalled();
  });

  it("does not create a second credit when one already exists", async () => {
    findUnique.mockResolvedValue({
      id: "dep1",
      walletId: "w1",
      txid: "ABC123",
      status: "CONFIRMED",
      confirmedAt: new Date(),
      credit: { id: "credit1" },
    });
    updateDeposit.mockResolvedValue({});
    mockTx();

    const { confirmDepositAndCreateCredit } = await import(
      "./sponsorship.service.js"
    );
    const second = await confirmDepositAndCreateCredit("dep1", 25);
    expect(second.creditId).toBe("credit1");
    expect(createCredit).not.toHaveBeenCalled();
  });

  it("deactivated blacklist allows future deposit to qualify", async () => {
    findUnique.mockResolvedValue({
      id: "dep_new",
      walletId: "w1",
      txid: "NEW_TX",
      fromAddress: "TUserWasBad",
      status: "WAITING_CONFIRMATIONS",
      credit: null,
      rejectionReason: null,
    });
    // active lookup returns null after deactivation
    blacklistFindFirst.mockResolvedValue(null);
    count.mockResolvedValue(0);
    createCredit.mockResolvedValue({
      id: "credit_new",
      energyTarget: 150000,
      bandwidthTarget: 1000,
    });
    updateDeposit.mockResolvedValue({});
    mockTx();

    const { confirmDepositAndCreateCredit } = await import(
      "./sponsorship.service.js"
    );
    const result = await confirmDepositAndCreateCredit("dep_new", 20);
    expect(result.confirmed).toBe(true);
    expect(result.creditId).toBe("credit_new");
  });
});

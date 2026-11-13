import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccountTransactions = vi.fn();
const recordIncomingDeposit = vi.fn();
const listEnabled = vi.fn();
const getWorkerCursor = vi.fn();
const markWorkerRun = vi.fn();

vi.mock("../modules/tron/trongrid.client.js", () => ({
  TronGridClient: class {
    getAccountTransactions = getAccountTransactions;
  },
}));

vi.mock("../modules/tron/deposit.service.js", () => ({
  recordIncomingDeposit,
}));

vi.mock("../services/master-wallet.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../services/master-wallet.service.js")
  >("../services/master-wallet.service.js");
  return {
    ...actual,
    listEnabledMasterWalletsForNetwork: listEnabled,
    ensureLegacyMasterWalletMigrated: vi.fn(),
  };
});

vi.mock("./worker-state.js", () => ({
  getWorkerCursor,
  markWorkerRun,
}));

vi.mock("../config/index.js", () => ({
  getEnv: () => ({
    TRON_NETWORK: "mainnet",
    MASTER_TRON_ADDRESS: "",
  }),
}));

vi.mock("../lib/logger.js", () => ({
  logEvent: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../modules/tron/tron.address.js", () => ({
  isValidTronAddress: () => true,
  normalizeTronAddress: (a: string) => a,
}));

vi.mock("../modules/tron/trx-parser.js", () => ({
  parseIncomingTrxTransfers: (
    _raw: unknown[],
    master: string,
  ) => [
    {
      txid: `tx-for-${master}`,
      fromAddress: "TUser",
      toAddress: master,
      amountTrx: 1,
      amountSun: 1_000_000,
      blockNumber: 1,
      blockTimestampMs: 5_000,
      confirmedHint: true,
    },
  ],
}));

describe("multi-master TRX monitor", () => {
  beforeEach(() => {
    vi.resetModules();
    getAccountTransactions.mockReset();
    recordIncomingDeposit.mockReset();
    listEnabled.mockReset();
    getWorkerCursor.mockReset();
    markWorkerRun.mockReset();
    getWorkerCursor.mockResolvedValue(null);
    markWorkerRun.mockResolvedValue(undefined);
    getAccountTransactions.mockResolvedValue({ data: [{}], meta: {} });
    recordIncomingDeposit.mockResolvedValue({ created: true, depositId: "d1" });
  });

  it("monitors one enabled master wallet and records deposit with masterWalletId", async () => {
    listEnabled.mockResolvedValue([
      {
        id: "mw-a",
        address: "TMasterA",
        label: "A",
        network: "mainnet",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const { runTrxDepositMonitorOnce } = await import(
      "./trx-deposit-monitor.js"
    );
    const result = await runTrxDepositMonitorOnce();
    expect(result.wallets).toBe(1);
    expect(result.created).toBe(1);
    expect(recordIncomingDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ toAddress: "TMasterA" }),
      expect.objectContaining({
        masterWalletId: "mw-a",
        masterAddress: "TMasterA",
      }),
    );
  });

  it("monitors two enabled master wallets sequentially", async () => {
    listEnabled.mockResolvedValue([
      {
        id: "mw-a",
        address: "TMasterA",
        label: "A",
        network: "mainnet",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "mw-b",
        address: "TMasterB",
        label: "B",
        network: "mainnet",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const { runTrxDepositMonitorOnce } = await import(
      "./trx-deposit-monitor.js"
    );
    const result = await runTrxDepositMonitorOnce();
    expect(result.wallets).toBe(2);
    expect(getAccountTransactions).toHaveBeenCalledTimes(2);
    expect(recordIncomingDeposit).toHaveBeenCalledTimes(2);
  });

  it("does not monitor when no enabled wallets", async () => {
    listEnabled.mockResolvedValue([]);
    const { runTrxDepositMonitorOnce } = await import(
      "./trx-deposit-monitor.js"
    );
    const result = await runTrxDepositMonitorOnce();
    expect(result.wallets).toBe(0);
    expect(getAccountTransactions).not.toHaveBeenCalled();
  });

  it("uses independent checkpoint worker names per wallet", async () => {
    listEnabled.mockResolvedValue([
      {
        id: "mw-a",
        address: "TMasterA",
        label: "A",
        network: "mainnet",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "mw-b",
        address: "TMasterB",
        label: "B",
        network: "mainnet",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const { monitorWorkerName } = await import(
      "../services/master-wallet.service.js"
    );
    const { runTrxDepositMonitorOnce } = await import(
      "./trx-deposit-monitor.js"
    );
    await runTrxDepositMonitorOnce();

    const cursorCalls = getWorkerCursor.mock.calls.map((c) => c[0] as string);
    expect(cursorCalls).toContain(monitorWorkerName("mw-a"));
    expect(cursorCalls).toContain(monitorWorkerName("mw-b"));
    expect(monitorWorkerName("mw-a")).not.toBe(monitorWorkerName("mw-b"));
  });

  it("keeps TXID idempotent across restarts (duplicate skipped)", async () => {
    listEnabled.mockResolvedValue([
      {
        id: "mw-a",
        address: "TMasterA",
        label: "A",
        network: "mainnet",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    recordIncomingDeposit
      .mockResolvedValueOnce({ created: true, depositId: "d1" })
      .mockResolvedValueOnce({
        created: false,
        skippedReason: "duplicate_txid",
        depositId: "d1",
      });

    const { runTrxDepositMonitorOnce } = await import(
      "./trx-deposit-monitor.js"
    );
    const first = await runTrxDepositMonitorOnce();
    const second = await runTrxDepositMonitorOnce();
    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
  });
});

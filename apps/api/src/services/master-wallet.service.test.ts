import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findUnique = vi.fn();
const findFirst = vi.fn();
const create = vi.fn();
const update = vi.fn();
const upsert = vi.fn();
const deleteFn = vi.fn();
const updateMany = vi.fn();
const settingFindUnique = vi.fn();

vi.mock("@tron-gas-sponsor/database", () => ({
  prisma: {
    masterWallet: {
      findMany,
      findUnique,
      findFirst,
      create,
      update,
      upsert,
      delete: deleteFn,
    },
    systemSetting: { findUnique: settingFindUnique },
    tRXDeposit: { updateMany },
  },
}));

vi.mock("../config/index.js", () => ({
  getEnv: () => ({
    TRON_NETWORK: "mainnet",
    MASTER_TRON_ADDRESS: "",
  }),
}));

vi.mock("../modules/tron/tron.address.js", () => ({
  isValidTronAddress: (a: string) => a.startsWith("T") && a.length >= 10,
  normalizeTronAddress: (a: string) => a,
}));

describe("master wallet service", () => {
  beforeEach(() => {
    vi.resetModules();
    findMany.mockReset();
    findUnique.mockReset();
    create.mockReset();
    update.mockReset();
    deleteFn.mockReset();
    upsert.mockReset();
    updateMany.mockReset();
    settingFindUnique.mockResolvedValue(null);
  });

  it("rejects invalid TRON address on create", async () => {
    const { createMasterWallet } = await import("./master-wallet.service.js");
    await expect(
      createMasterWallet({
        address: "not-valid",
        network: "mainnet",
      }),
    ).rejects.toThrow(/Invalid TRON address/);
  });

  it("prevents enabling wallet on mismatched network", async () => {
    const { createMasterWallet } = await import("./master-wallet.service.js");
    await expect(
      createMasterWallet({
        address: "TMasterWalletXXXXXXXXXXXXXXXXXXXX",
        network: "shasta",
        enabled: true,
      }),
    ).rejects.toThrow(/Cannot enable/);
  });

  it("disables instead of hard-deleting wallet with historical deposits", async () => {
    findUnique.mockResolvedValue({
      id: "mw1",
      address: "TMasterWalletXXXXXXXXXXXXXXXXXXXX",
      label: "A",
      network: "mainnet",
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { deposits: 3 },
    });
    update.mockResolvedValue({
      id: "mw1",
      address: "TMasterWalletXXXXXXXXXXXXXXXXXXXX",
      label: "A",
      network: "mainnet",
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { deposits: 3 },
    });

    const { deleteOrDisableMasterWallet } = await import(
      "./master-wallet.service.js"
    );
    const result = await deleteOrDisableMasterWallet("mw1");
    expect(result.deleted).toBe(false);
    expect(result.disabled).toBe(true);
    expect(deleteFn).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { enabled: false },
      }),
    );
  });

  it("hard-deletes wallet with no deposit history", async () => {
    findUnique.mockResolvedValue({
      id: "mw2",
      address: "TMasterWalletYYYYYYYYYYYYYYYYYYYY",
      label: "B",
      network: "mainnet",
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { deposits: 0 },
    });
    deleteFn.mockResolvedValue({});

    const { deleteOrDisableMasterWallet } = await import(
      "./master-wallet.service.js"
    );
    const result = await deleteOrDisableMasterWallet("mw2");
    expect(result.deleted).toBe(true);
    expect(deleteFn).toHaveBeenCalled();
  });

  it("lists only enabled wallets for the active network", async () => {
    findMany.mockResolvedValue([
      { id: "a", address: "TA", network: "mainnet", enabled: true },
    ]);
    const { listEnabledMasterWalletsForNetwork } = await import(
      "./master-wallet.service.js"
    );
    await listEnabledMasterWalletsForNetwork("mainnet");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enabled: true, network: "mainnet" },
      }),
    );
  });
});

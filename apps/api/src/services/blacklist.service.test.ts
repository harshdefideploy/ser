import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const findFirst = vi.fn();
const findMany = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock("@tron-gas-sponsor/database", () => ({
  prisma: {
    blacklistedWallet: {
      findUnique,
      findFirst,
      findMany,
      create,
      update,
    },
  },
}));

vi.mock("../modules/tron/tron.address.js", () => ({
  isValidTronAddress: (a: string) => a.startsWith("T") && a.length >= 10,
  normalizeTronAddress: (a: string) => a.trim(),
}));

describe("blacklist service", () => {
  beforeEach(() => {
    vi.resetModules();
    findUnique.mockReset();
    findFirst.mockReset();
    findMany.mockReset();
    create.mockReset();
    update.mockReset();
  });

  it("rejects invalid TRON address", async () => {
    const { addToBlacklist } = await import("./blacklist.service.js");
    await expect(
      addToBlacklist({ address: "bad", reason: "spam" }),
    ).rejects.toThrow(/Invalid TRON address/);
  });

  it("rejects empty reason", async () => {
    const { addToBlacklist } = await import("./blacklist.service.js");
    await expect(
      addToBlacklist({
        address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
        reason: "  ",
      }),
    ).rejects.toThrow(/Reason is required/);
  });

  it("rejects duplicate active blacklist address", async () => {
    findUnique.mockResolvedValue({
      id: "bl1",
      address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
      active: true,
    });
    const { addToBlacklist } = await import("./blacklist.service.js");
    await expect(
      addToBlacklist({
        address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
        reason: "abuse",
      }),
    ).rejects.toThrow(/already on the active blacklist/);
  });

  it("reactivates inactive entry instead of duplicating", async () => {
    findUnique.mockResolvedValue({
      id: "bl1",
      address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
      active: false,
      createdBy: "admin1",
    });
    update.mockResolvedValue({
      id: "bl1",
      address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
      active: true,
      reason: "new reason",
    });
    const { addToBlacklist } = await import("./blacklist.service.js");
    const row = await addToBlacklist({
      address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
      reason: "new reason",
      adminId: "admin2",
    });
    expect(update).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(row.active).toBe(true);
  });

  it("isSenderBlacklisted uses address + active lookup", async () => {
    findFirst.mockResolvedValue({ id: "bl1" });
    const { isSenderBlacklisted } = await import("./blacklist.service.js");
    await expect(
      isSenderBlacklisted("TBlacklistedXXXXXXXXXXXXXXXXXXXX"),
    ).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
          active: true,
        },
      }),
    );
  });

  it("deactivate sets active false with removed metadata", async () => {
    findUnique.mockResolvedValue({
      id: "bl1",
      address: "TBlacklistedXXXXXXXXXXXXXXXXXXXX",
      active: true,
    });
    update.mockResolvedValue({
      id: "bl1",
      active: false,
      removedAt: new Date(),
      removedBy: "admin1",
    });
    const { deactivateBlacklistEntry } = await import("./blacklist.service.js");
    const row = await deactivateBlacklistEntry("bl1", "admin1");
    expect(row.active).toBe(false);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          active: false,
          removedBy: "admin1",
        }),
      }),
    );
  });
});

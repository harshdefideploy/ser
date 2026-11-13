import { describe, expect, it, vi } from "vitest";
import {
  buildFixedSponsorshipPackage,
  providerOrderIdempotencyKey,
  DEFAULT_SETTINGS,
  BUSINESS_RULE,
} from "@tron-gas-sponsor/shared";
import {
  nextProvisioningStatus,
  planFixedSponsorshipOrders,
} from "./provisioning.service.js";

vi.mock("./settings.service.js", () => ({
  getSystemSettings: vi.fn(async () => ({
    energyTarget: 150_000,
    bandwidthTarget: 1_000,
  })),
}));

describe("fixed sponsorship package (business rule)", () => {
  it("always returns full configured Energy + Bandwidth (150000 / 1000)", () => {
    const pkg = buildFixedSponsorshipPackage({
      energyTarget: DEFAULT_SETTINGS.energyTarget,
      bandwidthTarget: DEFAULT_SETTINGS.bandwidthTarget,
    });

    expect(pkg.energyAmount).toBe(150_000);
    expect(pkg.bandwidthAmount).toBe(1_000);
  });

  it("does not reduce amounts when callers might wish to top-up", () => {
    // Simulate a mistaken "user already has 50k energy" idea — package
    // builder has no input for that, so requested amount stays full target.
    const pkg = buildFixedSponsorshipPackage({
      energyTarget: 150_000,
      bandwidthTarget: 1_000,
    });

    expect(pkg.energyAmount).toBe(150_000);
    expect(pkg.bandwidthAmount).toBe(1_000);
    expect(pkg).not.toHaveProperty("existingEnergy");
    expect(pkg).not.toHaveProperty("existingBandwidth");
  });

  it("regression: provisioning never requires user Energy/Bandwidth/USDT balances", async () => {
    expect(BUSINESS_RULE.ignoreExistingWalletResources).toBe(true);
    expect(BUSINESS_RULE.alwaysProvisionEnergyAndBandwidth).toBe(true);

    // Planner accepts only creditId — no wallet / USDT / resource balance args
    expect(planFixedSponsorshipOrders.length).toBe(1);

    const planned = await planFixedSponsorshipOrders("credit_regression_1");
    expect(planned.energy.requestedAmount).toBe(150_000);
    expect(planned.bandwidth.requestedAmount).toBe(1_000);
    expect(planned.package).not.toHaveProperty("existingEnergy");
    expect(planned.package).not.toHaveProperty("existingBandwidth");
    expect(planned.package).not.toHaveProperty("usdtBalance");
    expect(Object.keys(planned.package).sort()).toEqual([
      "bandwidthAmount",
      "energyAmount",
    ]);
  });

  it("rejects non-positive targets", () => {
    expect(() =>
      buildFixedSponsorshipPackage({ energyTarget: 0, bandwidthTarget: 1000 }),
    ).toThrow(/energyTarget/);
    expect(() =>
      buildFixedSponsorshipPackage({
        energyTarget: 150000,
        bandwidthTarget: -1,
      }),
    ).toThrow(/bandwidthTarget/);
  });

  it("uses stable hyphen idempotency keys per credit + resource", () => {
    expect(providerOrderIdempotencyKey("credit_1", "ENERGY")).toBe(
      "credit_1-ENERGY",
    );
    expect(providerOrderIdempotencyKey("credit_1", "BANDWIDTH")).toBe(
      "credit_1-BANDWIDTH",
    );
  });
});

describe("provisioning status transitions", () => {
  it("becomes ACTIVE only when both orders are filled", () => {
    expect(
      nextProvisioningStatus({
        energyFilled: true,
        bandwidthFilled: true,
        anyFailedAwaitingRetry: false,
        retriesExhausted: false,
      }),
    ).toBe("ACTIVE");
  });

  it("stays RETRYING on failure without creating a new credit", () => {
    expect(
      nextProvisioningStatus({
        energyFilled: true,
        bandwidthFilled: false,
        anyFailedAwaitingRetry: true,
        retriesExhausted: false,
      }),
    ).toBe("RETRYING");
  });

  it("marks FAILED after retry exhaustion (admin alert path)", () => {
    expect(
      nextProvisioningStatus({
        energyFilled: false,
        bandwidthFilled: false,
        anyFailedAwaitingRetry: true,
        retriesExhausted: true,
      }),
    ).toBe("FAILED");
  });

  it("uses PARTIALLY_PROVISIONED when one side is filled and no retry yet", () => {
    expect(
      nextProvisioningStatus({
        energyFilled: true,
        bandwidthFilled: false,
        anyFailedAwaitingRetry: false,
        retriesExhausted: false,
      }),
    ).toBe("PARTIALLY_PROVISIONED");
  });
});

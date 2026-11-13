import { BUSINESS_RULE, DEFAULT_SETTINGS } from "./constants.js";
import type { SponsorshipPackage } from "./types.js";

export interface PackageTargets {
  energyTarget: number;
  bandwidthTarget: number;
}

/**
 * Build the FIXED sponsorship package for a credit.
 *
 * CRITICAL BUSINESS RULE:
 * - Do NOT accept or use the user's existing Energy / Bandwidth balance.
 * - Do NOT reduce amounts because the wallet already has resources.
 * - Do NOT skip Energy or Bandwidth.
 * - Always request both configured targets in full.
 *
 * The function signature intentionally omits any wallet-balance parameters
 * so callers cannot pass "existing resources" by accident.
 */
export function buildFixedSponsorshipPackage(
  targets: PackageTargets = {
    energyTarget: DEFAULT_SETTINGS.energyTarget,
    bandwidthTarget: DEFAULT_SETTINGS.bandwidthTarget,
  },
): SponsorshipPackage {
  if (!BUSINESS_RULE.alwaysProvisionEnergyAndBandwidth) {
    throw new Error("Business rule requires both Energy and Bandwidth");
  }
  if (!BUSINESS_RULE.ignoreExistingWalletResources) {
    throw new Error("Business rule forbids using existing wallet resources");
  }

  const energyAmount = Number(targets.energyTarget);
  const bandwidthAmount = Number(targets.bandwidthTarget);

  if (!Number.isFinite(energyAmount) || energyAmount <= 0) {
    throw new Error("energyTarget must be a positive number");
  }
  if (!Number.isFinite(bandwidthAmount) || bandwidthAmount <= 0) {
    throw new Error("bandwidthTarget must be a positive number");
  }

  return {
    energyAmount,
    bandwidthAmount,
  };
}

/**
 * Idempotency key for a provider order.
 * Unique per credit + resource so worker restarts never create duplicate orders.
 */
/**
 * GetGas Idempotency-Key charset is [A-Za-z0-9-_ ] only (8–64 chars).
 * Use hyphen, never colon.
 */
export function providerOrderIdempotencyKey(
  creditId: string,
  resourceType: "ENERGY" | "BANDWIDTH",
): string {
  const key = `${creditId}-${resourceType}`;
  if (key.length < 8 || key.length > 64) {
    // cuid + suffix is within range; truncate safely if ever oversized
    return key.slice(0, 64);
  }
  return key;
}

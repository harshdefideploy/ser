import {
  buildFixedSponsorshipPackage,
  providerOrderIdempotencyKey,
  type SponsorshipPackage,
} from "@tron-gas-sponsor/shared";
import { getSystemSettings } from "./settings.service.js";

export interface PlannedProviderOrders {
  package: SponsorshipPackage;
  energy: {
    resourceType: "ENERGY";
    requestedAmount: number;
    idempotencyKey: string;
  };
  bandwidth: {
    resourceType: "BANDWIDTH";
    requestedAmount: number;
    idempotencyKey: string;
  };
}

/**
 * Plan provider orders for a sponsorship credit.
 *
 * BUSINESS RULE (hard invariant):
 * Never inspect or calculate the user's existing Energy or Bandwidth.
 * Always request the full configured ENERGY_TARGET + BANDWIDTH_TARGET.
 *
 * This planner deliberately has no parameters for wallet resource balances.
 * Phase 3 GetGas calls must use these planned amounts verbatim.
 */
export async function planFixedSponsorshipOrders(
  creditId: string,
): Promise<PlannedProviderOrders> {
  const settings = await getSystemSettings();
  const pkg = buildFixedSponsorshipPackage({
    energyTarget: settings.energyTarget,
    bandwidthTarget: settings.bandwidthTarget,
  });

  return {
    package: pkg,
    energy: {
      resourceType: "ENERGY",
      requestedAmount: pkg.energyAmount,
      idempotencyKey: providerOrderIdempotencyKey(creditId, "ENERGY"),
    },
    bandwidth: {
      resourceType: "BANDWIDTH",
      requestedAmount: pkg.bandwidthAmount,
      idempotencyKey: providerOrderIdempotencyKey(creditId, "BANDWIDTH"),
    },
  };
}

/**
 * Decide credit status while waiting on provider fills / retries.
 * Does not create credits or duplicate orders — callers own persistence.
 */
export function nextProvisioningStatus(input: {
  energyFilled: boolean;
  bandwidthFilled: boolean;
  anyFailedAwaitingRetry: boolean;
  retriesExhausted: boolean;
}):
  | "PROVISIONING"
  | "PARTIALLY_PROVISIONED"
  | "RETRYING"
  | "ACTIVE"
  | "FAILED" {
  if (input.energyFilled && input.bandwidthFilled) {
    return "ACTIVE";
  }
  if (input.retriesExhausted) {
    return "FAILED";
  }
  if (input.anyFailedAwaitingRetry) {
    return "RETRYING";
  }
  if (input.energyFilled || input.bandwidthFilled) {
    return "PARTIALLY_PROVISIONED";
  }
  return "PROVISIONING";
}

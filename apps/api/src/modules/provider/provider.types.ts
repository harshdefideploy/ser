/**
 * Provider order inputs.
 *
 * Do NOT add fields for existing wallet Energy/Bandwidth.
 * Amounts must always be the full configured sponsorship package.
 */
export interface CreateEnergyOrderInput {
  walletAddress: string;
  /** Full ENERGY_TARGET — never reduced by existing wallet Energy */
  amount: number;
  durationHours?: number;
  idempotencyKey: string;
}

export interface CreateBandwidthOrderInput {
  walletAddress: string;
  /** Full BANDWIDTH_TARGET — never reduced by existing wallet Bandwidth */
  amount: number;
  durationHours?: number;
  idempotencyKey: string;
}

export interface ProviderOrderResult {
  providerOrderId: string;
  status: "PENDING" | "SUBMITTED" | "FILLED" | "FAILED";
  requestedAmount: number;
  deliveredAmount?: number;
  costTrx?: number;
  costUsd?: number;
  raw?: unknown;
}

export interface ProviderOrderStatusResult {
  providerOrderId: string;
  status: "PENDING" | "SUBMITTED" | "FILLED" | "FAILED" | "CANCELLED";
  deliveredAmount?: number;
  costTrx?: number;
}

export interface ProviderBalance {
  trx?: number;
  usd?: number;
  raw?: unknown;
}

export interface ProviderWebhookPayload {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

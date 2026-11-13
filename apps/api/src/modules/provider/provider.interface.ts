/**
 * Provider abstraction — Phase 1 stub.
 * Concrete GetGas implementation arrives in Phase 3 after consulting
 * https://getgas.io/developers/docs (do not invent endpoints).
 *
 * BUSINESS RULE: providers only place orders for the FIXED package amounts
 * planned by provisioning.service. Never query the end-user wallet's
 * Energy/Bandwidth to resize or skip orders.
 */

import type {
  CreateBandwidthOrderInput,
  CreateEnergyOrderInput,
  ProviderBalance,
  ProviderOrderResult,
  ProviderOrderStatusResult,
  ProviderWebhookPayload,
} from "./provider.types.js";

export interface ResourceProvider {
  readonly name: string;
  createEnergyOrder(input: CreateEnergyOrderInput): Promise<ProviderOrderResult>;
  createBandwidthOrder(
    input: CreateBandwidthOrderInput,
  ): Promise<ProviderOrderResult>;
  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatusResult>;
  /** Provider account balance (our GetGas account) — NOT the end-user wallet */
  getBalance(): Promise<ProviderBalance>;
  handleWebhook(payload: ProviderWebhookPayload): Promise<void>;
}

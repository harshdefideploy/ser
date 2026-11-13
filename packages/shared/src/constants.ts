/**
 * Core business rules (invariants).
 *
 * 1. 1 qualifying TRX deposit = 1 sponsorship credit
 * 2. Sponsorship package is FIXED by SystemSetting / env — never by the
 *    user's current on-chain Energy, Bandwidth, TRX, USDT, or token balances.
 */
export const BUSINESS_RULE = {
  depositsPerCredit: 1,
  /** Always provision BOTH resources for every credit */
  alwaysProvisionEnergyAndBandwidth: true,
  /**
   * NEVER inspect wallet Energy/Bandwidth/USDT/token balances before ordering.
   * Existing user resources are irrelevant to eligibility and amounts.
   */
  ignoreExistingWalletResources: true,
} as const;

export const DEFAULT_SETTINGS = {
  minimumQualifyingTrx: "1",
  /** Fixed Energy package per sponsorship (not top-up-to-target) */
  energyTarget: 150_000,
  /** Fixed Bandwidth package per sponsorship (not top-up-to-target) */
  bandwidthTarget: 1_000,
  /** Provider order retries before admin alert + FAILED */
  providerOrderMaxRetries: 5,
  providerTerm: "1h",
  sponsorshipExpiryHours: 24,
  confirmationsRequired: 20,
  providerName: "getgas",
  masterWalletAddress: "",
  monitorIntervalMs: 6_000,
  dailyProviderLimitTrx: "1000",
  monthlyProviderLimitTrx: "20000",
  maxActiveSponsorships: 500,
  maxCreditsPerWalletPerDay: 10,
  maxSponsorshipsPerIpPerDay: 50,
  maxGlobalSponsorshipsPerDay: 2000,
} as const;

export const TRON_NETWORKS = ["mainnet", "shasta", "nile"] as const;

export const LOG_EVENTS = {
  TRX_DETECTED: "TRX_DETECTED",
  TRX_CONFIRMED: "TRX_CONFIRMED",
  CREDIT_CREATED: "CREDIT_CREATED",
  PROVIDER_ORDER_CREATED: "PROVIDER_ORDER_CREATED",
  PROVIDER_ORDER_FILLED: "PROVIDER_ORDER_FILLED",
  SPONSORSHIP_ACTIVE: "SPONSORSHIP_ACTIVE",
  SPONSORSHIP_EXPIRED: "SPONSORSHIP_EXPIRED",
  PROVIDER_FAILED: "PROVIDER_FAILED",
  PROVIDER_RETRY_EXHAUSTED: "PROVIDER_RETRY_EXHAUSTED",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  ADMIN_LOGIN: "ADMIN_LOGIN",
  ADMIN_LOGOUT: "ADMIN_LOGOUT",
} as const;

export type LogEvent = (typeof LOG_EVENTS)[keyof typeof LOG_EVENTS];

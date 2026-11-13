import type {
  CreditStatus,
  DepositStatus,
  ProviderOrderStatus,
} from "./status.js";

export interface DashboardStats {
  totalTrxDeposited: string;
  totalSponsorships: number;
  activeSponsorships: number;
  usedSponsorships: number;
  pendingSponsorships: number;
  retryingSponsorships: number;
  failedSponsorships: number;
  blockedDeposits: number;
  activeBlacklistedWallets: number;
  totalEnergyPurchased: string;
  totalBandwidthPurchased: string;
  totalProviderCostTrx: string;
  averageCostPerSponsoredTx: string;
  dailyProviderLimitReached: boolean;
  monthlyProviderLimitReached: boolean;
}

export interface HealthCheckResult {
  status: "ok" | "degraded" | "down";
  checks: {
    database: ComponentHealth;
    tronRpc: ComponentHealth;
    getGas: ComponentHealth;
    workers: ComponentHealth;
  };
  timestamp: string;
  network: string;
  appEnv: string;
}

export interface ComponentHealth {
  status: "ok" | "degraded" | "down" | "skipped";
  latencyMs?: number;
  message?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SponsorshipListItem {
  id: string;
  walletAddress: string;
  depositTxid: string | null;
  depositAmountTrx: string | null;
  status: CreditStatus;
  energyTarget: number;
  bandwidthTarget: number;
  energyDelivered: string | null;
  bandwidthDelivered: string | null;
  provider: string | null;
  providerCostTrx: string | null;
  createdAt: string;
  usedAt: string | null;
  activatedAt: string | null;
}

export interface DepositListItem {
  id: string;
  txid: string;
  fromAddress: string;
  toAddress: string;
  amountTrx: string;
  confirmations: number;
  status: DepositStatus;
  blockNumber: number | null;
  detectedAt: string;
  confirmedAt: string | null;
}

export interface OrderListItem {
  id: string;
  creditId: string;
  walletAddress: string;
  provider: string;
  providerOrderId: string | null;
  resourceType: string;
  requestedAmount: string;
  deliveredAmount: string | null;
  status: ProviderOrderStatus;
  providerCostTrx: string | null;
  requestedAt: string;
  filledAt: string | null;
}

export interface SystemSettingsDto {
  minimumQualifyingTrx: string;
  /** Fixed Energy amount requested every sponsorship — never reduced by wallet balance */
  energyTarget: number;
  /** Fixed Bandwidth amount requested every sponsorship — never reduced by wallet balance */
  bandwidthTarget: number;
  sponsorshipExpiryHours: number;
  confirmationsRequired: number;
  providerName: string;
  masterWalletAddress: string;
  monitorIntervalMs: number;
  dailyProviderLimitTrx: string;
  monthlyProviderLimitTrx: string;
  maxActiveSponsorships: number;
  maxCreditsPerWalletPerDay: number;
  maxSponsorshipsPerIpPerDay: number;
  maxGlobalSponsorshipsPerDay: number;
  providerOrderMaxRetries: number;
  providerTerm: "15m" | "1h";
}

/**
 * Fixed sponsorship package derived ONLY from admin/config targets.
 * Intentionally has no fields for existing Energy/Bandwidth/USDT/token balances.
 */
export interface SponsorshipPackage {
  energyAmount: number;
  bandwidthAmount: number;
}

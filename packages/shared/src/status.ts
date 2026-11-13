export const DepositStatus = {
  DETECTED: "DETECTED",
  WAITING_CONFIRMATIONS: "WAITING_CONFIRMATIONS",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
  REORGED: "REORGED",
} as const;

export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

export const CreditStatus = {
  PENDING: "PENDING",
  PROVISIONING: "PROVISIONING",
  /** One resource filled, the other still open / retrying */
  PARTIALLY_PROVISIONED: "PARTIALLY_PROVISIONED",
  /** Provider order(s) failed; retrying without creating a new credit */
  RETRYING: "RETRYING",
  ACTIVE: "ACTIVE",
  USED: "USED",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type CreditStatus = (typeof CreditStatus)[keyof typeof CreditStatus];

export const ProviderOrderStatus = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  FILLED: "FILLED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type ProviderOrderStatus =
  (typeof ProviderOrderStatus)[keyof typeof ProviderOrderStatus];

export const ResourceType = {
  ENERGY: "ENERGY",
  BANDWIDTH: "BANDWIDTH",
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const WalletStatus = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
  INACTIVE: "INACTIVE",
} as const;

export type WalletStatus = (typeof WalletStatus)[keyof typeof WalletStatus];

export const AdminRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  VIEWER: "VIEWER",
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

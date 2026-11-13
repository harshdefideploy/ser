-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('DETECTED', 'WAITING_CONFIRMATIONS', 'CONFIRMED', 'REJECTED', 'REORGED');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('PENDING', 'PROVISIONING', 'PARTIALLY_PROVISIONED', 'ACTIVE', 'USED', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ENERGY', 'BANDWIDTH');

-- CreateEnum
CREATE TYPE "ProviderOrderStatus" AS ENUM ('PENDING', 'SUBMITTED', 'FILLED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SponsoredTxStatus" AS ENUM ('DETECTED', 'WAITING_CONFIRMATIONS', 'CONFIRMED', 'UNSPONSORED', 'FAILED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecretEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_deposits" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "blockNumber" BIGINT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amountTrx" DECIMAL(36,18) NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "status" "DepositStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trx_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_credits" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "status" "CreditStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "sponsorship_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_orders" (
    "id" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "resourceType" "ResourceType" NOT NULL,
    "requestedAmount" DECIMAL(36,0) NOT NULL,
    "deliveredAmount" DECIMAL(36,0),
    "duration" INTEGER,
    "status" "ProviderOrderStatus" NOT NULL DEFAULT 'PENDING',
    "providerCostTrx" DECIMAL(36,18),
    "providerCostUsd" DECIMAL(36,18),
    "idempotencyKey" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "lastError" TEXT,

    CONSTRAINT "provider_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsored_transactions" (
    "id" TEXT NOT NULL,
    "creditId" TEXT,
    "walletId" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "tokenContract" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL DEFAULT 'USDT',
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "energyUsed" BIGINT,
    "bandwidthUsed" BIGINT,
    "trxBurned" DECIMAL(36,18),
    "status" "SponsoredTxStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsored_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_states" (
    "id" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "cursor" TEXT,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_analytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sponsorshipsCreated" INTEGER NOT NULL DEFAULT 0,
    "sponsorshipsUsed" INTEGER NOT NULL DEFAULT 0,
    "sponsorshipsFailed" INTEGER NOT NULL DEFAULT 0,
    "sponsorshipsExpired" INTEGER NOT NULL DEFAULT 0,
    "trxDeposited" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "providerCostTrx" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "energyPurchased" DECIMAL(36,0) NOT NULL DEFAULT 0,
    "bandwidthPurchased" DECIMAL(36,0) NOT NULL DEFAULT 0,
    "energyConsumed" DECIMAL(36,0) NOT NULL DEFAULT 0,
    "bandwidthConsumed" DECIMAL(36,0) NOT NULL DEFAULT 0,
    "sponsoredTxCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "wallets_address_idx" ON "wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_network_key" ON "wallets"("address", "network");

-- CreateIndex
CREATE UNIQUE INDEX "trx_deposits_txid_key" ON "trx_deposits"("txid");

-- CreateIndex
CREATE INDEX "trx_deposits_fromAddress_idx" ON "trx_deposits"("fromAddress");

-- CreateIndex
CREATE INDEX "trx_deposits_status_idx" ON "trx_deposits"("status");

-- CreateIndex
CREATE INDEX "trx_deposits_detectedAt_idx" ON "trx_deposits"("detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_credits_depositId_key" ON "sponsorship_credits"("depositId");

-- CreateIndex
CREATE INDEX "sponsorship_credits_walletId_status_idx" ON "sponsorship_credits"("walletId", "status");

-- CreateIndex
CREATE INDEX "sponsorship_credits_status_expiresAt_idx" ON "sponsorship_credits"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_orders_idempotencyKey_key" ON "provider_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "provider_orders_status_idx" ON "provider_orders"("status");

-- CreateIndex
CREATE INDEX "provider_orders_providerOrderId_idx" ON "provider_orders"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_orders_creditId_resourceType_key" ON "provider_orders"("creditId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "sponsored_transactions_txid_key" ON "sponsored_transactions"("txid");

-- CreateIndex
CREATE INDEX "sponsored_transactions_walletId_status_idx" ON "sponsored_transactions"("walletId", "status");

-- CreateIndex
CREATE INDEX "sponsored_transactions_fromAddress_idx" ON "sponsored_transactions"("fromAddress");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "worker_states_workerName_key" ON "worker_states"("workerName");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_date_key" ON "daily_analytics"("date");

-- AddForeignKey
ALTER TABLE "trx_deposits" ADD CONSTRAINT "trx_deposits_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_credits" ADD CONSTRAINT "sponsorship_credits_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_credits" ADD CONSTRAINT "sponsorship_credits_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "trx_deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_orders" ADD CONSTRAINT "provider_orders_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "sponsorship_credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_orders" ADD CONSTRAINT "provider_orders_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_transactions" ADD CONSTRAINT "sponsored_transactions_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "sponsorship_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_transactions" ADD CONSTRAINT "sponsored_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "blacklisted_wallets" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,

    CONSTRAINT "blacklisted_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_wallets_address_key" ON "blacklisted_wallets"("address");

-- CreateIndex
CREATE INDEX "blacklisted_wallets_address_active_idx" ON "blacklisted_wallets"("address", "active");

-- CreateIndex
CREATE INDEX "blacklisted_wallets_active_idx" ON "blacklisted_wallets"("active");

-- AlterTable
ALTER TABLE "trx_deposits" ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "trx_deposits_rejectionReason_idx" ON "trx_deposits"("rejectionReason");

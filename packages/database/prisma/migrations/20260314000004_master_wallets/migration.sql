-- CreateTable
CREATE TABLE "master_wallets" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "network" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_wallets_address_key" ON "master_wallets"("address");

-- CreateIndex
CREATE INDEX "master_wallets_enabled_network_idx" ON "master_wallets"("enabled", "network");

-- AlterTable
ALTER TABLE "trx_deposits" ADD COLUMN "masterWalletId" TEXT;

-- CreateIndex
CREATE INDEX "trx_deposits_masterWalletId_idx" ON "trx_deposits"("masterWalletId");

-- AddForeignKey
ALTER TABLE "trx_deposits" ADD CONSTRAINT "trx_deposits_masterWalletId_fkey" FOREIGN KEY ("masterWalletId") REFERENCES "master_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

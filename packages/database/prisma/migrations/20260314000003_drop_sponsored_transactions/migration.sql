-- DropTable (USDT/token monitoring removed from product scope)
DROP TABLE IF EXISTS "sponsored_transactions";

-- DropEnum
DROP TYPE IF EXISTS "SponsoredTxStatus";

-- AlterTable indexes for deposit query paths
CREATE INDEX IF NOT EXISTS "trx_deposits_toAddress_idx" ON "trx_deposits"("toAddress");
CREATE INDEX IF NOT EXISTS "trx_deposits_createdAt_idx" ON "trx_deposits"("createdAt");
CREATE INDEX IF NOT EXISTS "provider_orders_creditId_idx" ON "provider_orders"("creditId");

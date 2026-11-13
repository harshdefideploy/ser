-- AlterTable
ALTER TABLE "sponsorship_credits" ADD COLUMN "energyTarget" INTEGER NOT NULL DEFAULT 150000;
ALTER TABLE "sponsorship_credits" ADD COLUMN "bandwidthTarget" INTEGER NOT NULL DEFAULT 1000;

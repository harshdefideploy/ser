import { prisma } from "@tron-gas-sponsor/database";
import type { DashboardStats } from "@tron-gas-sponsor/shared";
import { BLACKLIST_REJECTION_REASON } from "./blacklist.service.js";
import { getSystemSettings } from "./settings.service.js";

function decimalToString(value: { toString(): string } | null | undefined): string {
  if (!value) return "0";
  return value.toString();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const settings = await getSystemSettings();

  const [
    depositAgg,
    totalSponsorships,
    activeSponsorships,
    usedSponsorships,
    pendingSponsorships,
    retryingSponsorships,
    failedSponsorships,
    blockedDeposits,
    activeBlacklistedWallets,
    energyAgg,
    bandwidthAgg,
    costAgg,
    completedWithCost,
  ] = await Promise.all([
    prisma.tRXDeposit.aggregate({
      _sum: { amountTrx: true },
      where: { status: "CONFIRMED" },
    }),
    prisma.sponsorshipCredit.count(),
    prisma.sponsorshipCredit.count({ where: { status: "ACTIVE" } }),
    prisma.sponsorshipCredit.count({ where: { status: "USED" } }),
    prisma.sponsorshipCredit.count({
      where: {
        status: {
          in: ["PENDING", "PROVISIONING", "PARTIALLY_PROVISIONED"],
        },
      },
    }),
    prisma.sponsorshipCredit.count({ where: { status: "RETRYING" } }),
    prisma.sponsorshipCredit.count({ where: { status: "FAILED" } }),
    prisma.tRXDeposit.count({
      where: {
        status: "REJECTED",
        rejectionReason: BLACKLIST_REJECTION_REASON,
      },
    }),
    prisma.blacklistedWallet.count({ where: { active: true } }),
    prisma.providerOrder.aggregate({
      _sum: { deliveredAmount: true },
      where: { resourceType: "ENERGY", status: "FILLED" },
    }),
    prisma.providerOrder.aggregate({
      _sum: { deliveredAmount: true },
      where: { resourceType: "BANDWIDTH", status: "FILLED" },
    }),
    prisma.providerOrder.aggregate({
      _sum: { providerCostTrx: true },
      where: { status: "FILLED" },
    }),
    prisma.sponsorshipCredit.count({
      where: { status: { in: ["ACTIVE", "USED", "EXPIRED"] } },
    }),
  ]);

  const totalProviderCost = costAgg._sum.providerCostTrx;
  const avgCost =
    completedWithCost > 0 && totalProviderCost
      ? (Number(totalProviderCost.toString()) / completedWithCost).toString()
      : "0";

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(
    Date.UTC(startOfDay.getUTCFullYear(), startOfDay.getUTCMonth(), 1),
  );

  const [dailySpend, monthlySpend] = await Promise.all([
    prisma.providerOrder.aggregate({
      _sum: { providerCostTrx: true },
      where: {
        status: "FILLED",
        filledAt: { gte: startOfDay },
      },
    }),
    prisma.providerOrder.aggregate({
      _sum: { providerCostTrx: true },
      where: {
        status: "FILLED",
        filledAt: { gte: startOfMonth },
      },
    }),
  ]);

  const dailyCost = Number(dailySpend._sum.providerCostTrx ?? 0);
  const monthlyCost = Number(monthlySpend._sum.providerCostTrx ?? 0);

  return {
    totalTrxDeposited: decimalToString(depositAgg._sum.amountTrx),
    totalSponsorships,
    activeSponsorships,
    usedSponsorships,
    pendingSponsorships,
    retryingSponsorships,
    failedSponsorships,
    blockedDeposits,
    activeBlacklistedWallets,
    totalEnergyPurchased: decimalToString(energyAgg._sum.deliveredAmount),
    totalBandwidthPurchased: decimalToString(bandwidthAgg._sum.deliveredAmount),
    totalProviderCostTrx: decimalToString(totalProviderCost),
    averageCostPerSponsoredTx: avgCost,
    dailyProviderLimitReached:
      dailyCost >= Number(settings.dailyProviderLimitTrx),
    monthlyProviderLimitReached:
      monthlyCost >= Number(settings.monthlyProviderLimitTrx),
  };
}

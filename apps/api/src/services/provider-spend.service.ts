import { prisma } from "@tron-gas-sponsor/database";
import { getSystemSettings } from "./settings.service.js";

export async function canPlaceProviderOrders(): Promise<{
  allowed: boolean;
  reason?: string;
  dailySpend: number;
  monthlySpend: number;
}> {
  const settings = await getSystemSettings();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(
    Date.UTC(startOfDay.getUTCFullYear(), startOfDay.getUTCMonth(), 1),
  );

  const activeCount = await prisma.sponsorshipCredit.count({
    where: { status: "ACTIVE" },
  });
  if (activeCount >= settings.maxActiveSponsorships) {
    return {
      allowed: false,
      reason: "max_active_sponsorships",
      dailySpend: 0,
      monthlySpend: 0,
    };
  }

  const [daily, monthly] = await Promise.all([
    prisma.providerOrder.aggregate({
      _sum: { providerCostTrx: true },
      where: {
        status: { in: ["FILLED", "SUBMITTED", "PENDING"] },
        requestedAt: { gte: startOfDay },
      },
    }),
    prisma.providerOrder.aggregate({
      _sum: { providerCostTrx: true },
      where: {
        status: { in: ["FILLED", "SUBMITTED", "PENDING"] },
        requestedAt: { gte: startOfMonth },
      },
    }),
  ]);

  const dailySpend = Number(daily._sum.providerCostTrx ?? 0);
  const monthlySpend = Number(monthly._sum.providerCostTrx ?? 0);

  if (dailySpend >= Number(settings.dailyProviderLimitTrx)) {
    return {
      allowed: false,
      reason: "daily_provider_limit",
      dailySpend,
      monthlySpend,
    };
  }
  if (monthlySpend >= Number(settings.monthlyProviderLimitTrx)) {
    return {
      allowed: false,
      reason: "monthly_provider_limit",
      dailySpend,
      monthlySpend,
    };
  }

  return { allowed: true, dailySpend, monthlySpend };
}

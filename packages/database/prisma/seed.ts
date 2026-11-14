import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

function loadRootEnv() {
  const candidate = resolve(process.cwd(), "../../.env");
  if (!existsSync(candidate)) return;
  for (const line of readFileSync(candidate, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadRootEnv();

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: Array<{
  key: string;
  value: string;
  description: string;
}> = [
  {
    key: "minimumQualifyingTrx",
    value:
      process.env.MIN_TRX_DEPOSIT ?? process.env.MIN_QUALIFYING_TRX ?? "0.1",
    description: "Minimum TRX deposit amount to earn one sponsorship credit",
  },
  {
    key: "energyTarget",
    value: process.env.ENERGY_TARGET ?? "150000",
    description:
      "FIXED Energy amount requested every sponsorship. Never reduced by the user's existing Energy balance.",
  },
  {
    key: "bandwidthTarget",
    value: process.env.BANDWIDTH_TARGET ?? "1000",
    description:
      "FIXED Bandwidth amount requested every sponsorship. Never reduced by the user's existing Bandwidth balance. Always provisioned together with Energy.",
  },
  {
    key: "providerOrderMaxRetries",
    value: process.env.PROVIDER_ORDER_MAX_RETRIES ?? "5",
    description:
      "Max provider order retries before credit FAILED + admin alert. Never creates a new credit on retry.",
  },
  {
    key: "providerTerm",
    value: process.env.GETGAS_PROVIDER_TERM ?? "1h",
    description: "GetGas resource term: 15m or 1h",
  },
  {
    key: "sponsorshipExpiryHours",
    value: process.env.SPONSORSHIP_EXPIRY_HOURS ?? "24",
    description: "Hours until an unused ACTIVE credit expires",
  },
  {
    key: "confirmationsRequired",
    value: process.env.CONFIRMATIONS_REQUIRED ?? "1",
    description: "TRON confirmations required before confirming deposits/TX",
  },
  {
    key: "providerName",
    value: "getgas",
    description: "Active resource provider name",
  },
  {
    key: "masterWalletAddress",
    value: process.env.MASTER_TRON_ADDRESS ?? "",
    description:
      "DEPRECATED single-address setting. Prefer MasterWallet table (/admin/master-wallets). Still migrated into MasterWallet on seed.",
  },
  {
    key: "monitorIntervalMs",
    value:
      process.env.TRONGRID_POLL_INTERVAL ??
      process.env.MONITOR_INTERVAL_MS ??
      "2000",
    description: "TronGrid master-wallet poll interval in milliseconds",
  },
  {
    key: "dailyProviderLimitTrx",
    value: process.env.DAILY_PROVIDER_LIMIT_TRX ?? "1000",
    description: "Max provider spend in TRX per day",
  },
  {
    key: "monthlyProviderLimitTrx",
    value: process.env.MONTHLY_PROVIDER_LIMIT_TRX ?? "20000",
    description: "Max provider spend in TRX per month",
  },
  {
    key: "maxActiveSponsorships",
    value: process.env.MAX_ACTIVE_SPONSORSHIPS ?? "500",
    description: "Max concurrent ACTIVE sponsorship credits",
  },
  {
    key: "maxCreditsPerWalletPerDay",
    value: process.env.MAX_CREDITS_PER_WALLET_PER_DAY ?? "10",
    description: "Anti-abuse: max credits per wallet per day",
  },
  {
    key: "maxSponsorshipsPerIpPerDay",
    value: process.env.MAX_SPONSORSHIPS_PER_IP_PER_DAY ?? "50",
    description: "Anti-abuse: max sponsorships per IP per day",
  },
  {
    key: "maxGlobalSponsorshipsPerDay",
    value: process.env.MAX_GLOBAL_SPONSORSHIPS_PER_DAY ?? "2000",
    description: "Anti-abuse: max global sponsorships per day",
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMeSecurely123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
    },
  });

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      // Keep speed/finality knobs aligned with env on each deploy/seed.
      update:
        setting.key === "confirmationsRequired" ||
        setting.key === "monitorIntervalMs" ||
        setting.key === "minimumQualifyingTrx"
          ? { value: setting.value, description: setting.description }
          : {},
      create: setting,
    });
  }

  // Remove discarded USDT/token workflow settings if present
  await prisma.systemSetting.deleteMany({
    where: { key: { in: ["usdtContractAddress"] } },
  });
  await prisma.workerState.deleteMany({
    where: {
      workerName: {
        in: ["usdt-transaction-monitor", "usdt-confirmation", "analytics-aggregation"],
      },
    },
  });

  const workerNames = [
    "trx-deposit-monitor",
    "trx-confirmation",
    "sponsorship-provisioning",
    "getgas-order-status",
    "retry-worker",
    "expired-sponsorship",
  ];

  for (const workerName of workerNames) {
    await prisma.workerState.upsert({
      where: { workerName },
      update: {},
      create: {
        workerName,
        isHealthy: true,
        lastError: "Not started yet",
      },
    });
  }

  // Migrate legacy MASTER_TRON_ADDRESS into MasterWallet (source of truth)
  const legacyAddress =
    process.env.MASTER_TRON_ADDRESS?.trim() ||
    (
      await prisma.systemSetting.findUnique({
        where: { key: "masterWalletAddress" },
      })
    )?.value?.trim() ||
    "";
  if (legacyAddress) {
    const network = process.env.TRON_NETWORK ?? "mainnet";
    await prisma.masterWallet.upsert({
      where: { address: legacyAddress },
      create: {
        address: legacyAddress,
        label: "Legacy master wallet",
        network,
        enabled: true,
      },
      update: {},
    });
    console.log(`Ensured MasterWallet for legacy address: ${legacyAddress}`);
  }

  console.log(`Seeded admin user: ${email}`);
  console.log(`Seeded ${DEFAULT_SETTINGS.length} system settings`);
  console.log(`Seeded ${workerNames.length} worker state rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

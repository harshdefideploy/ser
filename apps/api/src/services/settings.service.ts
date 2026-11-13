import { prisma } from "@tron-gas-sponsor/database";
import type { SystemSettingsDto } from "@tron-gas-sponsor/shared";
import { DEFAULT_SETTINGS } from "@tron-gas-sponsor/shared";

function toDto(map: Map<string, string>): SystemSettingsDto {
  return {
    minimumQualifyingTrx:
      map.get("minimumQualifyingTrx") ?? DEFAULT_SETTINGS.minimumQualifyingTrx,
    energyTarget: Number(
      map.get("energyTarget") ?? DEFAULT_SETTINGS.energyTarget,
    ),
    bandwidthTarget: Number(
      map.get("bandwidthTarget") ?? DEFAULT_SETTINGS.bandwidthTarget,
    ),
    sponsorshipExpiryHours: Number(
      map.get("sponsorshipExpiryHours") ??
        DEFAULT_SETTINGS.sponsorshipExpiryHours,
    ),
    confirmationsRequired: Number(
      map.get("confirmationsRequired") ??
        DEFAULT_SETTINGS.confirmationsRequired,
    ),
    providerName:
      map.get("providerName") ?? DEFAULT_SETTINGS.providerName,
    masterWalletAddress:
      map.get("masterWalletAddress") ?? DEFAULT_SETTINGS.masterWalletAddress,
    monitorIntervalMs: Number(
      map.get("monitorIntervalMs") ?? DEFAULT_SETTINGS.monitorIntervalMs,
    ),
    dailyProviderLimitTrx:
      map.get("dailyProviderLimitTrx") ??
      DEFAULT_SETTINGS.dailyProviderLimitTrx,
    monthlyProviderLimitTrx:
      map.get("monthlyProviderLimitTrx") ??
      DEFAULT_SETTINGS.monthlyProviderLimitTrx,
    maxActiveSponsorships: Number(
      map.get("maxActiveSponsorships") ??
        DEFAULT_SETTINGS.maxActiveSponsorships,
    ),
    maxCreditsPerWalletPerDay: Number(
      map.get("maxCreditsPerWalletPerDay") ??
        DEFAULT_SETTINGS.maxCreditsPerWalletPerDay,
    ),
    maxSponsorshipsPerIpPerDay: Number(
      map.get("maxSponsorshipsPerIpPerDay") ??
        DEFAULT_SETTINGS.maxSponsorshipsPerIpPerDay,
    ),
    maxGlobalSponsorshipsPerDay: Number(
      map.get("maxGlobalSponsorshipsPerDay") ??
        DEFAULT_SETTINGS.maxGlobalSponsorshipsPerDay,
    ),
    providerOrderMaxRetries: Number(
      map.get("providerOrderMaxRetries") ??
        DEFAULT_SETTINGS.providerOrderMaxRetries,
    ),
    providerTerm: (map.get("providerTerm") === "15m" ? "15m" : "1h") as
      | "15m"
      | "1h",
  };
}

export async function getSystemSettings(): Promise<SystemSettingsDto> {
  const rows = await prisma.systemSetting.findMany();
  const map = new Map<string, string>(
    rows.map((r: { key: string; value: string }) => [r.key, r.value]),
  );
  return toDto(map);
}

const DANGEROUS_KEYS = new Set(["masterWalletAddress", "providerName"]);

export async function updateSystemSettings(
  updates: Partial<SystemSettingsDto>,
  adminId: string,
  confirmedDangerous = false,
): Promise<SystemSettingsDto> {
  const entries = Object.entries(updates).filter(
    ([, v]) => v !== undefined && v !== null,
  );

  const dangerousTouched = entries.some(([k]) => DANGEROUS_KEYS.has(k));
  if (dangerousTouched && !confirmedDangerous) {
    throw new Error(
      "Dangerous settings change requires confirmation (confirmDangerous=true)",
    );
  }

  for (const [key, value] of entries) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: String(value),
        updatedBy: adminId,
      },
      create: {
        key,
        value: String(value),
        updatedBy: adminId,
      },
    });
  }

  // Compatibility: legacy single address setting → MasterWallet table
  const legacyMaster = entries.find(([k]) => k === "masterWalletAddress");
  if (legacyMaster && String(legacyMaster[1]).trim()) {
    const { createMasterWallet } = await import("./master-wallet.service.js");
    const { getEnv } = await import("../config/index.js");
    try {
      await createMasterWallet({
        address: String(legacyMaster[1]).trim(),
        label: "Legacy master wallet",
        network: getEnv().TRON_NETWORK,
        enabled: true,
      });
    } catch {
      // already exists or invalid — ignore
    }
  }

  await prisma.auditLog.create({
    data: {
      adminId,
      action: "SETTINGS_UPDATED",
      entityType: "SystemSetting",
      metadata: { keys: entries.map(([k]) => k) },
    },
  });

  return getSystemSettings();
}

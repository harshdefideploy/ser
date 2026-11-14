import { prisma } from "@tron-gas-sponsor/database";
import { getEnv } from "../config/index.js";
import {
  isValidTronAddress,
  normalizeTronAddress,
} from "../modules/tron/tron.address.js";

export type MasterWalletRow = {
  id: string;
  address: string;
  label: string;
  network: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { deposits: number };
};

/**
 * Migrate legacy MASTER_TRON_ADDRESS / settings.masterWalletAddress into
 * MasterWallet rows. Database MasterWallet is the source of truth afterward.
 */
export async function ensureLegacyMasterWalletMigrated(): Promise<void> {
  const env = getEnv();
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "masterWalletAddress" },
  });
  const candidates = [
    setting?.value?.trim(),
    env.MASTER_TRON_ADDRESS?.trim(),
  ].filter((a): a is string => Boolean(a));

  for (const raw of candidates) {
    if (!isValidTronAddress(raw)) continue;
    const address = normalizeTronAddress(raw);
    await prisma.masterWallet.upsert({
      where: { address },
      create: {
        address,
        label: "Legacy master wallet",
        network: env.TRON_NETWORK,
        enabled: true,
      },
      // Keep legacy master aligned with process network after env switches
      // (e.g. shasta → mainnet) so deposit monitoring does not skip it.
      update: {
        network: env.TRON_NETWORK,
        enabled: true,
      },
    });
  }

  // Backfill deposits that match a known master address
  const masters = await prisma.masterWallet.findMany();
  for (const m of masters) {
    await prisma.tRXDeposit.updateMany({
      where: {
        masterWalletId: null,
        toAddress: m.address,
      },
      data: { masterWalletId: m.id },
    });
  }
}

export async function listMasterWallets(): Promise<MasterWalletRow[]> {
  await ensureLegacyMasterWalletMigrated();
  return prisma.masterWallet.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { deposits: true } } },
  });
}

/** Enabled masters for the process TRON_NETWORK only. */
export async function listEnabledMasterWalletsForNetwork(
  network: string,
): Promise<MasterWalletRow[]> {
  await ensureLegacyMasterWalletMigrated();
  return prisma.masterWallet.findMany({
    where: { enabled: true, network },
    orderBy: { createdAt: "asc" },
  });
}

export async function createMasterWallet(input: {
  address: string;
  label?: string;
  network: string;
  enabled?: boolean;
}): Promise<MasterWalletRow> {
  if (!isValidTronAddress(input.address)) {
    throw Object.assign(new Error("Invalid TRON address"), { statusCode: 400 });
  }
  const address = normalizeTronAddress(input.address);
  const network = input.network.trim();
  if (!["mainnet", "shasta", "nile"].includes(network)) {
    throw Object.assign(new Error("Invalid network"), { statusCode: 400 });
  }

  const enabled = input.enabled ?? true;
  if (enabled && network !== getEnv().TRON_NETWORK) {
    throw Object.assign(
      new Error(
        `Cannot enable a ${network} wallet while TRON_NETWORK=${getEnv().TRON_NETWORK}`,
      ),
      { statusCode: 400 },
    );
  }

  try {
    return await prisma.masterWallet.create({
      data: {
        address,
        label: input.label?.trim() || address.slice(0, 8),
        network,
        enabled,
      },
      include: { _count: { select: { deposits: true } } },
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      throw Object.assign(new Error("Master wallet address already exists"), {
        statusCode: 409,
      });
    }
    throw err;
  }
}

export async function updateMasterWallet(
  id: string,
  input: {
    label?: string;
    enabled?: boolean;
    network?: string;
  },
): Promise<MasterWalletRow> {
  const existing = await prisma.masterWallet.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error("Master wallet not found"), {
      statusCode: 404,
    });
  }

  const network = input.network?.trim() ?? existing.network;
  if (!["mainnet", "shasta", "nile"].includes(network)) {
    throw Object.assign(new Error("Invalid network"), { statusCode: 400 });
  }

  const enabled = input.enabled ?? existing.enabled;
  if (enabled && network !== getEnv().TRON_NETWORK) {
    throw Object.assign(
      new Error(
        `Cannot enable a ${network} wallet while TRON_NETWORK=${getEnv().TRON_NETWORK}`,
      ),
      { statusCode: 400 },
    );
  }

  return prisma.masterWallet.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.network !== undefined ? { network } : {}),
    },
    include: { _count: { select: { deposits: true } } },
  });
}

/**
 * Soft-delete: disable when historical deposits exist.
 * Hard-delete only when never used.
 */
export async function deleteOrDisableMasterWallet(id: string): Promise<{
  deleted: boolean;
  disabled: boolean;
  wallet: MasterWalletRow;
}> {
  const existing = await prisma.masterWallet.findUnique({
    where: { id },
    include: { _count: { select: { deposits: true } } },
  });
  if (!existing) {
    throw Object.assign(new Error("Master wallet not found"), {
      statusCode: 404,
    });
  }

  if (existing._count.deposits > 0) {
    const wallet = await prisma.masterWallet.update({
      where: { id },
      data: { enabled: false },
      include: { _count: { select: { deposits: true } } },
    });
    return { deleted: false, disabled: true, wallet };
  }

  await prisma.masterWallet.delete({ where: { id } });
  return { deleted: true, disabled: false, wallet: existing };
}

export function monitorWorkerName(masterWalletId: string): string {
  return `trx-deposit-monitor:${masterWalletId}`;
}

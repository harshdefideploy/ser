import { prisma } from "@tron-gas-sponsor/database";
import {
  isValidTronAddress,
  normalizeTronAddress,
} from "../modules/tron/tron.address.js";

export const BLACKLIST_REJECTION_REASON = "BLACKLISTED_SENDER" as const;

export async function isSenderBlacklisted(address: string): Promise<boolean> {
  if (!address) return false;
  let normalized: string;
  try {
    normalized = normalizeTronAddress(address);
  } catch {
    normalized = address.trim();
  }
  const row = await prisma.blacklistedWallet.findFirst({
    where: { address: normalized, active: true },
    select: { id: true },
  });
  return Boolean(row);
}

export async function listBlacklist(input?: {
  q?: string;
  active?: boolean;
}) {
  const where = {
    ...(input?.active === undefined ? {} : { active: input.active }),
    ...(input?.q
      ? {
          OR: [
            { address: { contains: input.q, mode: "insensitive" as const } },
            { reason: { contains: input.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  return prisma.blacklistedWallet.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function addToBlacklist(input: {
  address: string;
  reason: string;
  adminId?: string;
}) {
  const reason = input.reason.trim();
  if (!reason) {
    throw Object.assign(new Error("Reason is required"), { statusCode: 400 });
  }
  if (!isValidTronAddress(input.address)) {
    throw Object.assign(new Error("Invalid TRON address"), { statusCode: 400 });
  }
  const address = normalizeTronAddress(input.address);

  const existing = await prisma.blacklistedWallet.findUnique({
    where: { address },
  });

  if (existing?.active) {
    throw Object.assign(
      new Error("Address is already on the active blacklist"),
      { statusCode: 409 },
    );
  }

  if (existing && !existing.active) {
    return prisma.blacklistedWallet.update({
      where: { id: existing.id },
      data: {
        active: true,
        reason,
        createdBy: input.adminId ?? existing.createdBy,
        removedAt: null,
        removedBy: null,
      },
    });
  }

  return prisma.blacklistedWallet.create({
    data: {
      address,
      reason,
      active: true,
      createdBy: input.adminId ?? null,
    },
  });
}

export async function updateBlacklistEntry(
  id: string,
  input: { reason?: string; active?: boolean; adminId?: string },
) {
  const existing = await prisma.blacklistedWallet.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error("Blacklist entry not found"), {
      statusCode: 404,
    });
  }

  const data: {
    reason?: string;
    active?: boolean;
    removedAt?: Date | null;
    removedBy?: string | null;
  } = {};

  if (input.reason !== undefined) {
    const reason = input.reason.trim();
    if (!reason) {
      throw Object.assign(new Error("Reason is required"), { statusCode: 400 });
    }
    data.reason = reason;
  }

  if (input.active !== undefined) {
    data.active = input.active;
    if (!input.active) {
      data.removedAt = new Date();
      data.removedBy = input.adminId ?? null;
    } else {
      data.removedAt = null;
      data.removedBy = null;
    }
  }

  return prisma.blacklistedWallet.update({
    where: { id },
    data,
  });
}

/** Prefer deactivation over hard delete. */
export async function deactivateBlacklistEntry(
  id: string,
  adminId?: string,
) {
  return updateBlacklistEntry(id, { active: false, adminId });
}

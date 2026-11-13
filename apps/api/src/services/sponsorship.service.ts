import { prisma } from "@tron-gas-sponsor/database";
import { LOG_EVENTS } from "@tron-gas-sponsor/shared";
import { logEvent } from "../lib/logger.js";
import { BLACKLIST_REJECTION_REASON } from "./blacklist.service.js";
import { getSystemSettings } from "./settings.service.js";
import { normalizeTronAddress } from "../modules/tron/tron.address.js";

export interface ConfirmDepositResult {
  confirmed: boolean;
  creditId?: string;
  skippedReason?: string;
}

/**
 * Mark deposit CONFIRMED and create exactly one SponsorshipCredit.
 * Idempotent on depositId uniqueness. Never checks user Energy/Bandwidth.
 *
 * Blacklisted senders → REJECTED + BLACKLISTED_SENDER, no credit / GetGas.
 */
export async function confirmDepositAndCreateCredit(
  depositId: string,
  confirmations: number,
): Promise<ConfirmDepositResult> {
  const settings = await getSystemSettings();

  return prisma.$transaction(async (tx) => {
    const deposit = await tx.tRXDeposit.findUnique({
      where: { id: depositId },
      include: { credit: true },
    });

    if (!deposit) {
      return { confirmed: false, skippedReason: "not_found" };
    }

    if (deposit.credit) {
      await tx.tRXDeposit.update({
        where: { id: depositId },
        data: {
          confirmations,
          status: "CONFIRMED",
          confirmedAt: deposit.confirmedAt ?? new Date(),
        },
      });
      return { confirmed: true, creditId: deposit.credit.id };
    }

    if (deposit.status === "REJECTED" || deposit.status === "REORGED") {
      // Stay blocked forever for this TXID (no retroactive sponsorship)
      return {
        confirmed: false,
        skippedReason:
          deposit.rejectionReason === BLACKLIST_REJECTION_REASON
            ? "blacklisted_sender"
            : deposit.status.toLowerCase(),
      };
    }

    // Sender blacklist check (indexed address + active)
    let senderAddress = deposit.fromAddress;
    try {
      senderAddress = normalizeTronAddress(deposit.fromAddress);
    } catch {
      /* keep raw */
    }
    const blacklisted = await tx.blacklistedWallet.findFirst({
      where: { address: senderAddress, active: true },
      select: { id: true },
    });
    if (blacklisted) {
      await tx.tRXDeposit.update({
        where: { id: depositId },
        data: {
          confirmations,
          status: "REJECTED",
          rejectionReason: BLACKLIST_REJECTION_REASON,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "DEPOSIT_BLACKLISTED_SENDER",
          entityType: "TRXDeposit",
          entityId: depositId,
          metadata: {
            txid: deposit.txid,
            fromAddress: deposit.fromAddress,
            reason: BLACKLIST_REJECTION_REASON,
          },
        },
      });
      logEvent(LOG_EVENTS.TRX_CONFIRMED, {
        txid: deposit.txid,
        depositId: deposit.id,
        blocked: true,
        reason: BLACKLIST_REJECTION_REASON,
      });
      return { confirmed: false, skippedReason: "blacklisted_sender" };
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const creditsToday = await tx.sponsorshipCredit.count({
      where: {
        walletId: deposit.walletId,
        createdAt: { gte: startOfDay },
      },
    });

    if (creditsToday >= settings.maxCreditsPerWalletPerDay) {
      await tx.tRXDeposit.update({
        where: { id: depositId },
        data: {
          confirmations,
          status: "REJECTED",
          rejectionReason: "DAILY_WALLET_LIMIT",
        },
      });
      await tx.auditLog.create({
        data: {
          action: "CREDIT_DAILY_LIMIT",
          entityType: "TRXDeposit",
          entityId: depositId,
          metadata: {
            walletId: deposit.walletId,
            creditsToday,
            limit: settings.maxCreditsPerWalletPerDay,
          },
        },
      });
      return { confirmed: false, skippedReason: "daily_wallet_limit" };
    }

    const expiresAt = new Date(
      Date.now() + settings.sponsorshipExpiryHours * 60 * 60 * 1000,
    );

    const credit = await tx.sponsorshipCredit.create({
      data: {
        walletId: deposit.walletId,
        depositId: deposit.id,
        status: "PENDING",
        energyTarget: settings.energyTarget,
        bandwidthTarget: settings.bandwidthTarget,
        expiresAt,
      },
    });

    await tx.tRXDeposit.update({
      where: { id: depositId },
      data: {
        confirmations,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        rejectionReason: null,
      },
    });

    logEvent(LOG_EVENTS.TRX_CONFIRMED, {
      txid: deposit.txid,
      depositId: deposit.id,
      confirmations,
    });
    logEvent(LOG_EVENTS.CREDIT_CREATED, {
      creditId: credit.id,
      depositId: deposit.id,
      energyTarget: credit.energyTarget,
      bandwidthTarget: credit.bandwidthTarget,
    });

    return { confirmed: true, creditId: credit.id };
  });
}

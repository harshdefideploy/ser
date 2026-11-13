import { prisma } from "@tron-gas-sponsor/database";
import { LOG_EVENTS } from "@tron-gas-sponsor/shared";
import { getEnv } from "../../config/index.js";
import { logEvent } from "../../lib/logger.js";
import { getSystemSettings } from "../../services/settings.service.js";
import {
  isQualifyingAmount,
  type IncomingTrxTransfer,
} from "./trx-parser.js";

export interface RecordDepositResult {
  created: boolean;
  skippedReason?: string;
  depositId?: string;
}

export interface RecordDepositContext {
  /** Receiving MasterWallet id — required for new multi-wallet path */
  masterWalletId: string;
  /** Expected receiving address (must match transfer.toAddress) */
  masterAddress: string;
  /** Network of the master wallet */
  network: string;
}

/**
 * Idempotently record an inbound TRX deposit by txid.
 * Does NOT create a sponsorship credit here — that happens after confirmations.
 */
export async function recordIncomingDeposit(
  transfer: IncomingTrxTransfer,
  context?: RecordDepositContext,
): Promise<RecordDepositResult> {
  const existing = await prisma.tRXDeposit.findUnique({
    where: { txid: transfer.txid },
    select: { id: true },
  });
  if (existing) {
    return {
      created: false,
      skippedReason: "duplicate_txid",
      depositId: existing.id,
    };
  }

  const settings = await getSystemSettings();

  let masterWalletId = context?.masterWalletId;
  let masterAddress = context?.masterAddress;
  let network = context?.network ?? getEnv().TRON_NETWORK;

  if (!masterWalletId || !masterAddress) {
    // Legacy fallback: resolve by toAddress among MasterWallet rows / settings
    const byAddress = await prisma.masterWallet.findFirst({
      where: { address: transfer.toAddress, enabled: true },
    });
    if (byAddress) {
      masterWalletId = byAddress.id;
      masterAddress = byAddress.address;
      network = byAddress.network;
    } else {
      const legacy =
        settings.masterWalletAddress || getEnv().MASTER_TRON_ADDRESS || "";
      if (!legacy || transfer.toAddress !== legacy) {
        return { created: false, skippedReason: "wrong_destination" };
      }
      masterAddress = legacy;
    }
  }

  if (transfer.toAddress !== masterAddress) {
    return { created: false, skippedReason: "wrong_destination" };
  }

  if (
    !isQualifyingAmount(
      transfer.amountTrx,
      Number(settings.minimumQualifyingTrx),
    )
  ) {
    return { created: false, skippedReason: "below_minimum" };
  }

  const deposit = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: {
        address_network: {
          address: transfer.fromAddress,
          network,
        },
      },
      create: {
        address: transfer.fromAddress,
        network,
      },
      update: {},
    });

    try {
      return await tx.tRXDeposit.create({
        data: {
          walletId: wallet.id,
          masterWalletId: masterWalletId ?? null,
          txid: transfer.txid,
          blockNumber:
            transfer.blockNumber !== null
              ? BigInt(transfer.blockNumber)
              : null,
          fromAddress: transfer.fromAddress,
          toAddress: transfer.toAddress,
          amountTrx: transfer.amountTrx.toString(),
          confirmations: 0,
          status: "DETECTED",
        },
      });
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (code === "P2002") {
        return null;
      }
      throw err;
    }
  });

  if (!deposit) {
    return { created: false, skippedReason: "duplicate_txid" };
  }

  logEvent(LOG_EVENTS.TRX_DETECTED, {
    txid: transfer.txid,
    from: transfer.fromAddress,
    amountTrx: transfer.amountTrx,
    depositId: deposit.id,
    masterWalletId: masterWalletId ?? null,
  });

  return { created: true, depositId: deposit.id };
}

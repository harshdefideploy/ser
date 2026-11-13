import { normalizeTronAddress } from "./tron.address.js";

const SUN_PER_TRX = 1_000_000;

export interface IncomingTrxTransfer {
  txid: string;
  fromAddress: string;
  toAddress: string;
  amountTrx: number;
  amountSun: number;
  blockNumber: number | null;
  blockTimestampMs: number | null;
  confirmedHint: boolean;
}

type RawContract = {
  type?: string;
  parameter?: {
    value?: {
      amount?: number | string;
      owner_address?: string;
      to_address?: string;
    };
  };
};

type RawTx = {
  txID?: string;
  txId?: string;
  blockNumber?: number;
  block_number?: number;
  block_timestamp?: number;
  ret?: Array<{ contractRet?: string }>;
  raw_data?: {
    contract?: RawContract[];
    timestamp?: number;
  };
};

/**
 * Extract inbound TRX TransferContract payments to masterAddress.
 * Ignores TRC-20, contract calls, and outgoing transfers.
 */
export function parseIncomingTrxTransfers(
  rawTxs: unknown[],
  masterAddress: string,
): IncomingTrxTransfer[] {
  const master = normalizeTronAddress(masterAddress);
  const out: IncomingTrxTransfer[] = [];

  for (const item of rawTxs) {
    const tx = item as RawTx;
    const txid = tx.txID ?? tx.txId;
    if (!txid || typeof txid !== "string") continue;

    const contracts = tx.raw_data?.contract ?? [];
    for (const contract of contracts) {
      if (contract.type !== "TransferContract") continue;
      const value = contract.parameter?.value;
      if (!value?.owner_address || !value.to_address) continue;

      let fromAddress: string;
      let toAddress: string;
      try {
        fromAddress = normalizeTronAddress(value.owner_address);
        toAddress = normalizeTronAddress(value.to_address);
      } catch {
        continue;
      }

      // Only inbound to master
      if (toAddress !== master) continue;
      // Ignore self-sends / noise
      if (fromAddress === master) continue;

      const amountSun = Number(value.amount ?? 0);
      if (!Number.isFinite(amountSun) || amountSun <= 0) continue;

      const blockNumber =
        typeof tx.blockNumber === "number"
          ? tx.blockNumber
          : typeof tx.block_number === "number"
            ? tx.block_number
            : null;

      const blockTimestampMs =
        typeof tx.block_timestamp === "number"
          ? tx.block_timestamp
          : typeof tx.raw_data?.timestamp === "number"
            ? tx.raw_data.timestamp
            : null;

      const confirmedHint =
        Array.isArray(tx.ret) &&
        tx.ret.some((r) => r.contractRet === "SUCCESS") &&
        blockNumber !== null;

      out.push({
        txid,
        fromAddress,
        toAddress,
        amountSun,
        amountTrx: amountSun / SUN_PER_TRX,
        blockNumber,
        blockTimestampMs,
        confirmedHint,
      });
    }
  }

  return out;
}

export function isQualifyingAmount(
  amountTrx: number,
  minimumQualifyingTrx: number,
): boolean {
  return amountTrx + 1e-12 >= minimumQualifyingTrx;
}

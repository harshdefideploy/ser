import { describe, expect, it } from "vitest";
import { hexToTronBase58, isValidTronAddress } from "./tron.address.js";
import {
  isQualifyingAmount,
  parseIncomingTrxTransfers,
} from "./trx-parser.js";

// Deterministic base58 addresses derived from hex via our encoder.
const ownerHex = "415cbdd86a2fa8dc4bddd8a8f69dba48572eec07fb";
const toHex = "41a7e14b129a12a382b99ba9e85494d36a1dbfd22a";
const fromAddress = hexToTronBase58(ownerHex);
const masterAddress = hexToTronBase58(toHex);

function transferTx(overrides?: {
  amount?: number;
  to?: string;
  from?: string;
  type?: string;
  txID?: string;
}) {
  return {
    txID: overrides?.txID ?? "abc123txid",
    blockNumber: 100,
    block_timestamp: 1_700_000_000_000,
    ret: [{ contractRet: "SUCCESS" }],
    raw_data: {
      contract: [
        {
          type: overrides?.type ?? "TransferContract",
          parameter: {
            value: {
              amount: overrides?.amount ?? 1_000_000,
              owner_address: overrides?.from ?? ownerHex,
              to_address: overrides?.to ?? toHex,
            },
          },
        },
      ],
    },
  };
}

describe("tron address helpers", () => {
  it("validates base58 addresses", () => {
    expect(isValidTronAddress(masterAddress)).toBe(true);
    expect(isValidTronAddress("not-an-address")).toBe(false);
  });
});

describe("parseIncomingTrxTransfers", () => {
  it("accepts qualifying inbound TRX to master", () => {
    const result = parseIncomingTrxTransfers([transferTx()], masterAddress);
    expect(result).toHaveLength(1);
    expect(result[0]!.fromAddress).toBe(fromAddress);
    expect(result[0]!.toAddress).toBe(masterAddress);
    expect(result[0]!.amountTrx).toBe(1);
  });

  it("ignores below-minimum amounts at filter helper", () => {
    expect(isQualifyingAmount(0.5, 1)).toBe(false);
    expect(isQualifyingAmount(1, 1)).toBe(true);
  });

  it("ignores wrong destination", () => {
    const other = hexToTronBase58("41" + "11".repeat(20));
    const result = parseIncomingTrxTransfers(
      [transferTx({ to: "41" + "11".repeat(20) })],
      masterAddress,
    );
    expect(result).toHaveLength(0);
    expect(other).not.toBe(masterAddress);
  });

  it("ignores outgoing-style (from master)", () => {
    const result = parseIncomingTrxTransfers(
      [transferTx({ from: toHex, to: ownerHex })],
      masterAddress,
    );
    expect(result).toHaveLength(0);
  });

  it("ignores non-TRX contract types", () => {
    const result = parseIncomingTrxTransfers(
      [transferTx({ type: "TriggerSmartContract" })],
      masterAddress,
    );
    expect(result).toHaveLength(0);
  });
});

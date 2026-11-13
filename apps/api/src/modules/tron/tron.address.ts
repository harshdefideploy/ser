import { createHash } from "node:crypto";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function sha256(buf: Buffer): Buffer {
  return createHash("sha256").update(buf).digest();
}

function base58Encode(payload: Buffer): string {
  let zeros = 0;
  while (zeros < payload.length && payload[zeros] === 0) zeros += 1;

  const digits = [0];
  for (const byte of payload) {
    let carry = byte;
    for (let j = 0; j < digits.length; j += 1) {
      carry += digits[j]! << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    out += BASE58_ALPHABET[digits[i]!]!;
  }
  return out;
}

function base58Decode(input: string): Buffer {
  const bytes = [0];
  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value < 0) throw new Error(`Invalid Base58 character: ${char}`);
    let carry = value;
    for (let j = 0; j < bytes.length; j += 1) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let zeros = 0;
  for (const c of input) {
    if (c !== "1") break;
    zeros += 1;
  }

  const out = Buffer.alloc(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[out.length - 1 - i] = bytes[i]!;
  }
  return out;
}

/** TRON Base58Check address validation (starts with T, 34 chars). */
export function isValidTronAddress(address: string): boolean {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return false;
  try {
    const decoded = base58Decode(address);
    if (decoded.length !== 25) return false;
    if (decoded[0] !== 0x41) return false;
    const payload = decoded.subarray(0, 21);
    const checksum = decoded.subarray(21);
    const expected = sha256(sha256(payload)).subarray(0, 4);
    return checksum.equals(expected);
  } catch {
    return false;
  }
}

/** Convert hex address (41... or 0x41...) to Base58Check. */
export function hexToTronBase58(hex: string): string {
  let cleaned = hex.toLowerCase().replace(/^0x/, "");
  if (cleaned.startsWith("41") === false && cleaned.length === 40) {
    cleaned = `41${cleaned}`;
  }
  if (!/^[0-9a-f]+$/i.test(cleaned) || cleaned.length !== 42) {
    throw new Error(`Invalid TRON hex address: ${hex}`);
  }
  const payload = Buffer.from(cleaned, "hex");
  const checksum = sha256(sha256(payload)).subarray(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}

export function normalizeTronAddress(addressOrHex: string): string {
  const trimmed = addressOrHex.trim();
  if (trimmed.startsWith("T")) {
    if (!isValidTronAddress(trimmed)) {
      throw new Error(`Invalid TRON address: ${trimmed}`);
    }
    return trimmed;
  }
  return hexToTronBase58(trimmed);
}

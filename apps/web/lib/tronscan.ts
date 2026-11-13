const NETWORK =
  process.env.NEXT_PUBLIC_TRON_NETWORK ?? "mainnet";

function base(): string {
  if (NETWORK === "shasta") return "https://shasta.tronscan.org";
  if (NETWORK === "nile") return "https://nile.tronscan.org";
  return "https://tronscan.org";
}

export function tronscanAddressUrl(address: string): string {
  return `${base()}/#/address/${address}`;
}

export function tronscanTxUrl(txid: string): string {
  return `${base()}/#/transaction/${txid}`;
}

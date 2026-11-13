import Link from "next/link";
import { LegalShell } from "@/components/layout/legal-shell";

export default function HelpPage() {
  return (
    <LegalShell title="Help" subtitle="How TRON Gas Sponsor works">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Deposit flow</h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          Qualifying inbound TRX to a configured master receiving wallet is
          confirmed on-chain, checked against the sender blacklist, then
          credited once per TXID. Each credit provisions a fixed package of
          150,000 Energy and 1,000 Bandwidth via GetGas.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Admin console</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
          <li>Monitor deposits and sponsorship status</li>
          <li>Manage master receiving wallets</li>
          <li>Block or unblock sender addresses</li>
          <li>Review GetGas provider health</li>
        </ul>
      </section>
      <p className="text-sm text-ink-muted">
        Need access?{" "}
        <Link href="/login" className="text-accent">
          Sign in
        </Link>
      </p>
    </LegalShell>
  );
}

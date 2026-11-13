import { LegalShell } from "@/components/layout/legal-shell";

export default function RiskDisclosurePage() {
  return (
    <LegalShell
      title="Risk Disclosure"
      subtitle="Important operational and market risks"
    >
      <p className="text-sm leading-relaxed text-ink-muted">
        Blockchain networks, third-party energy providers, and exchange rates
        can fail, delay, or change without notice. Sponsorship delivery depends
        on provider availability and on-chain confirmation rules.
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">
        Blacklisted senders receive no credit and no GetGas order. Incorrect
        network selection, under-confirmation, or misconfigured master wallets
        may prevent sponsorship. Operators should verify settings before going
        live.
      </p>
    </LegalShell>
  );
}

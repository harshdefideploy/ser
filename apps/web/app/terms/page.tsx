import { LegalShell } from "@/components/layout/legal-shell";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use" subtitle="Operational terms for this service">
      <p className="text-sm leading-relaxed text-ink-muted">
        This software provides TRX deposit monitoring and fixed Energy /
        Bandwidth sponsorship through a third-party provider. Use is limited to
        authorized operators. You are responsible for wallet custody, network
        selection, and compliance with applicable law.
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">
        The service never requests or stores private keys. Only public
        addresses and operational metadata are processed.
      </p>
    </LegalShell>
  );
}

import { LegalShell } from "@/components/layout/legal-shell";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy" subtitle="How operational data is handled">
      <p className="text-sm leading-relaxed text-ink-muted">
        We process public blockchain addresses, deposit transaction identifiers,
        sponsorship status, and admin account credentials required to operate
        the console. Private keys are never collected.
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">
        Audit logs record administrative actions for security and
        troubleshooting. Provider API credentials remain server-side and are
        not exposed to the browser.
      </p>
    </LegalShell>
  );
}

import Link from "next/link";

export function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-2xl animate-fade-up">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-ink-muted"
        >
          <span className="text-accent">✦</span> TRON Gas Sponsor
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        <div className="card-premium mt-6 space-y-4 p-5">{children}</div>
        <nav className="mt-6 flex flex-wrap gap-4 text-xs text-ink-faint">
          <Link href="/help">Help</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/risk-disclosure">Risk disclosure</Link>
        </nav>
      </div>
    </div>
  );
}

"use client";

export function LiveAtmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="live-scan" />
    </div>
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-white shadow-glow">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {label}
    </span>
  );
}

export function LiveFlowTrack() {
  return (
    <div className="live-flow mt-4 overflow-hidden rounded-xl bg-white/70 ring-1 ring-blue-100">
      <div className="live-flow-track flex min-w-max items-center gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
        <span>Deposit detected</span>
        <span className="text-sky-400">→</span>
        <span>Confirming</span>
        <span className="text-sky-400">→</span>
        <span>GetGas energy</span>
        <span className="text-sky-400">→</span>
        <span>Bandwidth</span>
        <span className="text-sky-400">→</span>
        <span>Active</span>
        <span className="mx-4 text-ink-faint">•</span>
        <span>Deposit detected</span>
        <span className="text-sky-400">→</span>
        <span>Confirming</span>
        <span className="text-sky-400">→</span>
        <span>GetGas energy</span>
        <span className="text-sky-400">→</span>
        <span>Bandwidth</span>
        <span className="text-sky-400">→</span>
        <span>Active</span>
      </div>
    </div>
  );
}

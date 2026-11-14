import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-premium animate-enter p-4 md:p-5", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  alert,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  alert?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        alert ? "border-amber-300 ring-1 ring-amber-200" : undefined,
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/5" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </Card>
  );
}

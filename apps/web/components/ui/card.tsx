import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-premium animate-enter p-4", className)}>
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
        alert ? "border-accent-warning/40" : undefined,
        className,
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </Card>
  );
}

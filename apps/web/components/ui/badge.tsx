import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  success: "bg-emerald-50 text-accent-success border-emerald-200",
  warning: "bg-amber-50 text-accent-warning border-amber-200",
  danger: "bg-red-50 text-accent-danger border-red-200",
  info: "bg-accent-soft text-accent border-blue-200",
  muted: "bg-slate-50 text-ink-muted border-canvas-border",
};

export function Badge({
  children,
  variant = "muted",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusVariant(
  status: string,
): keyof typeof variants {
  const s = status.toUpperCase();
  if (
    [
      "ACTIVE",
      "CONFIRMED",
      "FILLED",
      "USED",
      "OK",
      "ENABLED",
      "COMPLETED",
      "COMPLETE",
      "ONLINE",
    ].includes(s)
  ) {
    if (s === "ACTIVE" || s === "ENABLED" || s === "ONLINE") return "info";
    if (s === "USED") return "success";
    return "success";
  }
  if (
    [
      "PENDING",
      "PROVISIONING",
      "WAITING_CONFIRMATIONS",
      "DETECTED",
      "SUBMITTED",
      "PARTIALLY_PROVISIONED",
      "RETRYING",
    ].includes(s)
  ) {
    return "warning";
  }
  if (
    [
      "FAILED",
      "REJECTED",
      "CANCELLED",
      "EXPIRED",
      "DOWN",
      "INACTIVE",
      "DISABLED",
      "BLOCKED",
    ].includes(s)
  ) {
    return "danger";
  }
  return "muted";
}

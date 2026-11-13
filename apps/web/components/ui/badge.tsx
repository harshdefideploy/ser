import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  success: "bg-accent-success/15 text-accent-success border-accent-success/30",
  warning: "bg-accent-warning/15 text-accent-warning border-accent-warning/30",
  danger: "bg-accent-danger/15 text-accent-danger border-accent-danger/30",
  info: "bg-accent-info/15 text-accent-info border-accent-info/30",
  muted: "bg-white/5 text-ink-muted border-white/10",
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
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
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

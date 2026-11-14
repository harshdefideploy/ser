import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const styles = {
  primary:
    "bg-accent text-white hover:bg-blue-600 shadow-glow disabled:shadow-none",
  secondary:
    "bg-white text-ink hover:bg-canvas-soft border border-canvas-border shadow-sm",
  danger: "bg-accent-danger text-white hover:bg-red-600",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-accent/5",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "pressable inline-flex min-h-touch items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

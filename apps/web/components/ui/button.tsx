import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const styles = {
  primary:
    "bg-accent text-white hover:bg-blue-500 shadow-glow disabled:shadow-none",
  secondary:
    "bg-white/5 text-ink hover:bg-white/10 border border-white/10",
  danger: "bg-accent-danger text-white hover:bg-red-500",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-white/5",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "pressable inline-flex min-h-touch items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

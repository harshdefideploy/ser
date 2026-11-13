import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-touch w-full rounded-xl border border-white/10 bg-canvas-soft px-4 py-3 text-base text-ink placeholder:text-ink-faint outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
}

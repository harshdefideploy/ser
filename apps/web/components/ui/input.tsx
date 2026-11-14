import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-touch w-full rounded-xl border border-canvas-border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-faint outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15",
        className,
      )}
      {...props}
    />
  );
}

"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={label ?? "Copy"}
      className={cn(
        "pressable inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-ink-muted transition hover:bg-white/5 hover:text-ink",
        done && "text-accent-success",
        className,
      )}
    >
      {done ? (
        <Check className="h-4 w-4 scale-110 transition" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

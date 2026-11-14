"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";

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

  async function copy(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void copy(e)}
      title={label ?? "Copy"}
      aria-label={label ?? "Copy"}
      className={cn(
        "pressable inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-accent-soft hover:text-accent",
        done && "text-accent-success hover:text-accent-success",
        className,
      )}
    >
      {done ? (
        <Check className="h-3.5 w-3.5 scale-110 transition" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/** One-click copy chip for addresses / txids. */
export function CopyableText({
  value,
  mono = true,
  truncate = true,
  left = 6,
  right = 4,
  className,
  title,
}: {
  value: string;
  mono?: boolean;
  truncate?: boolean;
  left?: number;
  right?: number;
  className?: string;
  title?: string;
}) {
  const [done, setDone] = useState(false);
  const shown = truncate ? shortAddress(value, left, right) : value;

  async function copy(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void copy(e)}
      title={title ?? `Copy ${value}`}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-transparent bg-canvas-soft/80 px-2 py-1 text-left transition hover:border-blue-200 hover:bg-accent-soft",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 truncate text-xs text-ink",
          mono && "font-mono",
        )}
      >
        {shown}
      </span>
      <span
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-faint transition group-hover:bg-white group-hover:text-accent",
          done && "text-accent-success",
        )}
      >
        {done ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="sr-only">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-enter"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        className={cn(
          "relative z-10 w-full max-w-lg rounded-t-3xl border border-white/[0.08] bg-canvas-elevated p-5 shadow-2xl md:rounded-3xl",
          "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          "animate-fade-up",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 md:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="pressable flex min-h-touch min-w-touch items-center justify-center rounded-full bg-white/5 text-ink-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

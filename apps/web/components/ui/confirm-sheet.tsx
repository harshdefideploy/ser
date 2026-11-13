"use client";

import { Sheet } from "./sheet";
import { Button } from "./button";

export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  loading,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="min-h-touch flex-1"
          onClick={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={danger ? "danger" : "primary"}
          className="min-h-touch flex-1"
          disabled={loading}
          onClick={() => void onConfirm()}
        >
          {loading ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

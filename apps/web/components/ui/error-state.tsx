"use client";

import { Button } from "./button";

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data right now.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card-premium animate-enter px-5 py-8 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-5 min-h-touch"
          onClick={onRetry}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}

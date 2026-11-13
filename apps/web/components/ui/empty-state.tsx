import { Button } from "./button";
import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card-premium animate-enter px-5 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <span className="text-lg">✦</span>
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-5 inline-block">
          <Button type="button" variant="secondary" className="min-h-touch">
            {actionLabel}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

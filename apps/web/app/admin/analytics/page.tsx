"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: () =>
      apiFetch<{ daily: unknown[]; note: string }>("/admin/analytics"),
  });

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Daily sponsorship, deposit, and provider cost series."
      />
      {isLoading ? <p className="text-sm text-ink-muted">Loading…</p> : null}
      {error ? (
        <p className="text-sm text-accent-danger">{(error as Error).message}</p>
      ) : null}
      {data ? (
        <>
          {data.daily.length === 0 ? (
            <EmptyState
              title="No analytics yet"
              description={data.note}
            />
          ) : (
            <Card>
              <pre className="overflow-auto text-xs text-ink-muted">
                {JSON.stringify(data.daily, null, 2)}
              </pre>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

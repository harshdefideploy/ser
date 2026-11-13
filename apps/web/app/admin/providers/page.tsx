"use client";

import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { relativeTime } from "@/lib/format";

interface ProviderResponse {
  provider: string;
  apiConfigured: boolean;
  apiKeyExposed: boolean;
  note: string;
  balance: number | null;
  lastSuccessfulApiCall: string | null;
  lastError: string | null;
  totals: {
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    pendingOrders: number;
    totalEnergyBought: string;
    totalBandwidthBought: string;
    totalCostTrx: string;
  };
}

export default function ProvidersPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["providers"],
    queryFn: () => apiFetch<ProviderResponse>("/admin/providers"),
    refetchInterval: 30_000,
  });

  const online = Boolean(data?.apiConfigured && !data.lastError);

  return (
    <div>
      <PageHeader
        title="Provider Status"
        description="GetGas health and order totals. Live data from the API."
      />

      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <div className="grid gap-3 sm:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : null}
      {error ? (
        <ErrorState
          description="We couldn't load provider status."
          onRetry={() => void refetch()}
        />
      ) : null}

      {data ? (
        <>
          <Card className="mb-4 border-accent/20 bg-gradient-to-br from-accent/10 via-canvas-elevated to-canvas-elevated">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    {data.provider.toUpperCase()}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${online ? "bg-accent-success pulse-dot" : "bg-accent-warning"}`}
                    />
                    <p className="text-xl font-semibold text-ink">
                      {online ? "Online" : data.apiConfigured ? "Degraded" : "Not configured"}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{data.note}</p>
                </div>
              </div>
              <Badge variant={data.apiConfigured ? "success" : "warning"}>
                {data.apiConfigured ? "Configured" : "Missing key"}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  Energy package
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-ink">
                  150,000
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  Bandwidth package
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-ink">
                  1,000
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-ink-faint">
              Last response ·{" "}
              {data.lastSuccessfulApiCall
                ? relativeTime(data.lastSuccessfulApiCall)
                : "—"}
            </p>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Provider balance (TRX)"
              value={
                data.balance === null ? "—" : formatNumber(data.balance)
              }
            />
            <StatCard label="Total orders" value={data.totals.totalOrders} />
            <StatCard
              label="Successful"
              value={data.totals.successfulOrders}
            />
            <StatCard label="Failed" value={data.totals.failedOrders} />
            <StatCard label="Pending" value={data.totals.pendingOrders} />
            <StatCard
              label="Energy bought"
              value={formatNumber(data.totals.totalEnergyBought)}
            />
            <StatCard
              label="Bandwidth bought"
              value={formatNumber(data.totals.totalBandwidthBought)}
            />
            <StatCard
              label="Total cost (TRX)"
              value={formatNumber(data.totals.totalCostTrx)}
            />
          </div>

          {data.lastError ? (
            <Card className="mt-4 border-accent-danger/30 text-sm text-accent-danger">
              Last error: {data.lastError}
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

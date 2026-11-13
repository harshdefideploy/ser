"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { greeting } from "@/lib/format";
import type { DashboardStats } from "@tron-gas-sponsor/shared";

type OverviewStats = DashboardStats & {
  retryingSponsorships: number;
  blockedDeposits?: number;
  activeBlacklistedWallets?: number;
};

interface DashboardResponse {
  stats: OverviewStats;
  network: string;
  appEnv: string;
  note: string;
}

export default function AdminDashboardPage() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardResponse>("/admin/dashboard"),
  });

  const operational =
    data &&
    !data.stats.dailyProviderLimitReached &&
    data.stats.failedSponsorships === 0;

  return (
    <div className="space-y-4">
      <div className="animate-enter">
        <p className="text-sm text-ink-muted">{greeting()}, Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Command center
        </h1>
      </div>

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
          description="We couldn't load dashboard metrics."
          onRetry={() => void refetch()}
        />
      ) : null}

      {data ? (
        <>
          <Card className="border-accent/20 bg-gradient-to-br from-accent/10 via-canvas-elevated to-canvas-elevated">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                  System status
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${operational ? "bg-accent-success pulse-dot" : "bg-accent-warning"}`}
                  />
                  <p className="text-xl font-semibold text-ink">
                    {operational ? "Operational" : "Needs attention"}
                  </p>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {data.note}
                </p>
              </div>
              <Badge variant="muted">{data.network.toUpperCase()}</Badge>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="TRX deposited"
              value={formatNumber(data.stats.totalTrxDeposited)}
            />
            <StatCard
              label="Active sponsorships"
              value={data.stats.activeSponsorships}
            />
            <StatCard
              label="Provisioning"
              value={data.stats.pendingSponsorships}
            />
            <StatCard
              label="Retrying"
              value={data.stats.retryingSponsorships}
            />
            <StatCard label="Failed" value={data.stats.failedSponsorships} />
            <StatCard
              label="Blocked deposits"
              value={data.stats.blockedDeposits ?? 0}
            />
            <StatCard
              label="Blacklisted wallets"
              value={data.stats.activeBlacklistedWallets ?? 0}
            />
            <StatCard
              label="Provider cost"
              value={formatNumber(data.stats.totalProviderCostTrx)}
              alert={data.stats.dailyProviderLimitReached}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/admin/deposits" className="pressable card-premium p-4">
              <p className="text-sm font-medium text-ink">Deposits</p>
              <p className="mt-1 text-xs text-ink-muted">
                Review inbound TRX and block reasons
              </p>
            </Link>
            <Link
              href="/admin/master-wallets"
              className="pressable card-premium p-4"
            >
              <p className="text-sm font-medium text-ink">Master wallets</p>
              <p className="mt-1 text-xs text-ink-muted">
                Manage receiving addresses
              </p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownToLine,
  Landmark,
  Activity,
  Sparkles,
} from "lucide-react";
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
    <div className="space-y-5">
      <div className="animate-fade-up">
        <p className="text-sm font-medium text-accent">{greeting()}, Admin</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
          Command <span className="text-gradient-blue">center</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Live view of deposits, sponsorships, and provider spend — tuned for
          fast auto top-up.
        </p>
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
          <Card className="relative overflow-hidden border-blue-100 bg-gradient-to-br from-white via-white to-accent-soft/70 shadow-float">
            <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent ring-1 ring-blue-100">
                  <Activity className="h-3.5 w-3.5" />
                  System status
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <span
                    className={`h-3 w-3 rounded-full ${operational ? "bg-accent-success pulse-dot" : "bg-accent-warning"}`}
                  />
                  <p className="font-display text-2xl font-semibold text-ink">
                    {operational ? "Operational" : "Needs attention"}
                  </p>
                </div>
                <p className="mt-2 max-w-lg text-sm text-ink-muted">
                  {data.note}
                </p>
              </div>
              <Badge variant="info">{data.network.toUpperCase()}</Badge>
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
            <Link
              href="/admin/deposits"
              className="pressable group card-premium relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-float"
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-600 to-sky-400 opacity-80" />
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <ArrowDownToLine className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-ink group-hover:text-accent">
                    Deposits
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Review inbound TRX and block reasons
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/master-wallets"
              className="pressable group card-premium relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-float"
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 to-blue-600 opacity-80" />
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Landmark className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-ink group-hover:text-accent">
                    Master wallets
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Manage receiving addresses
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <Card className="border-dashed border-blue-200 bg-accent-soft/40">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-accent shadow-sm ring-1 ring-blue-100">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Auto top-up tip
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Senders who deposit at least{" "}
                  <span className="font-semibold text-accent">0.1 TRX</span> to
                  your master wallet get fixed energy + bandwidth in seconds.
                </p>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

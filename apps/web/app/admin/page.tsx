"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDownToLine,
  Landmark,
  Activity,
  Sparkles,
  Radio,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { LiveBadge, LiveFlowTrack } from "@/components/ui/live-atmosphere";
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardResponse>("/admin/dashboard"),
    refetchInterval: 8_000,
  });

  const operational =
    data &&
    !data.stats.dailyProviderLimitReached &&
    data.stats.failedSponsorships === 0;

  const clock = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-accent">
              {greeting()}, Admin
            </p>
            <LiveBadge />
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
            Command <span className="text-gradient-blue">center</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Live view of deposits, sponsorships, and provider spend — tuned for
            fast auto top-up.
          </p>
        </div>
        <div className="rounded-2xl border border-canvas-border bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Local time
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums text-ink">
            {clock}
          </p>
        </div>
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
          <Card className="live-ring relative overflow-hidden border-blue-100 bg-gradient-to-br from-white via-white to-accent-soft/70 shadow-float">
            <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 animate-[driftB_14s_ease-in-out_infinite] rounded-full bg-accent/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 animate-[driftA_16s_ease-in-out_infinite] rounded-full bg-sky-300/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent ring-1 ring-blue-100">
                  <Activity className="h-3.5 w-3.5 animate-[floatSoft_2.8s_ease-in-out_infinite]" />
                  System status
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <span
                    className={`h-3 w-3 rounded-full ${operational ? "bg-accent-success pulse-dot" : "bg-accent-warning pulse-dot"}`}
                  />
                  <p className="font-display text-2xl font-semibold text-ink">
                    {operational ? "Operational" : "Needs attention"}
                  </p>
                </div>
                <p className="mt-2 max-w-lg text-sm text-ink-muted">
                  {data.note}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                    <Radio className="h-3.5 w-3.5 text-accent" />
                    Auto-refreshing every 8s
                  </span>
                  {dataUpdatedAt ? (
                    <span className="rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-canvas-border">
                      Updated{" "}
                      {new Date(dataUpdatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  ) : null}
                </div>
                <LiveFlowTrack />
              </div>
              <Badge variant="info">{data.network.toUpperCase()}</Badge>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              stagger={1}
              label="TRX deposited"
              value={formatNumber(data.stats.totalTrxDeposited)}
            />
            <StatCard
              stagger={2}
              label="Active sponsorships"
              value={data.stats.activeSponsorships}
            />
            <StatCard
              stagger={3}
              label="Provisioning"
              value={data.stats.pendingSponsorships}
            />
            <StatCard
              stagger={4}
              label="Retrying"
              value={data.stats.retryingSponsorships}
            />
            <StatCard
              stagger={5}
              label="Failed"
              value={data.stats.failedSponsorships}
            />
            <StatCard
              stagger={6}
              label="Blocked deposits"
              value={data.stats.blockedDeposits ?? 0}
            />
            <StatCard
              stagger={7}
              label="Blacklisted wallets"
              value={data.stats.activeBlacklistedWallets ?? 0}
            />
            <StatCard
              stagger={8}
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
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:scale-110">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:scale-110">
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
              <span className="mt-0.5 flex h-9 w-9 animate-[floatSoft_3s_ease-in-out_infinite] items-center justify-center rounded-xl bg-white text-accent shadow-sm ring-1 ring-blue-100">
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

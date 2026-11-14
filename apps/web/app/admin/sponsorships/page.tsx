"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton, CopyableText } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { tronscanTxUrl } from "@/lib/tronscan";
import { relativeTime, shortAddress } from "@/lib/format";
import { formatNumber } from "@/lib/utils";

interface SponsorshipRow {
  id: string;
  walletAddress: string;
  depositTxid: string | null;
  status: string;
  energyTarget?: number;
  bandwidthTarget?: number;
  energyDelivered: string | null;
  bandwidthDelivered: string | null;
  provider: string | null;
  providerCostTrx: string | null;
  createdAt: string;
  activatedAt: string | null;
}

function statusPulse(status: string) {
  const s = status.toUpperCase();
  if (s.includes("ACTIVE") || s.includes("COMPLETE") || s.includes("FILLED")) {
    return "bg-accent-success";
  }
  if (s.includes("FAIL") || s.includes("EXPIRE")) return "bg-accent-danger";
  if (s.includes("RETRY") || s.includes("PENDING") || s.includes("PROVISION")) {
    return "bg-accent-warning pulse-dot";
  }
  return "bg-ink-faint";
}

export default function SponsorshipsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sponsorships"],
    queryFn: () =>
      apiFetch<{ data: SponsorshipRow[] }>(
        "/admin/sponsorships?page=1&pageSize=50",
      ),
  });

  return (
    <div>
      <PageHeader
        title="Sponsorships"
        description="Fixed Energy + Bandwidth package per qualifying deposit."
      />

      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}
      {error ? (
        <ErrorState
          description="We couldn't load sponsorships right now."
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          title="No sponsorships yet"
          description="Credits are created after confirmed qualifying master-wallet deposits."
          actionHref="/admin/deposits"
          actionLabel="View Deposits"
        />
      ) : null}

      <div className="space-y-3 md:hidden">
        {data?.data.map((row) => {
          const energy =
            row.energyDelivered ?? row.energyTarget ?? 150_000;
          const bandwidth =
            row.bandwidthDelivered ?? row.bandwidthTarget ?? 1_000;
          return (
            <Link key={row.id} href={`/admin/sponsorships/${row.id}`}>
              <Card className="mb-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                      Recipient
                    </p>
                    <div className="mt-1">
                      <CopyableText value={row.walletAddress} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${statusPulse(row.status)}`}
                    />
                    <Badge variant={statusVariant(row.status)}>
                      {row.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      Energy
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold text-ink">
                      {formatNumber(energy)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      Bandwidth
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold text-ink">
                      {formatNumber(bandwidth)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  {row.provider ? <span>{row.provider}</span> : null}
                  {row.providerCostTrx ? (
                    <span>· {row.providerCostTrx} TRX</span>
                  ) : null}
                  <span>· {relativeTime(row.createdAt)}</span>
                  {row.depositTxid ? (
                    <a
                      className="font-mono text-accent"
                      href={tronscanTxUrl(row.depositTxid)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      TX {shortAddress(row.depositTxid, 6, 4)}
                    </a>
                  ) : null}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {data && data.data.length > 0 ? (
        <div className="mt-1 hidden overflow-x-auto rounded-2xl border border-white/[0.06] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas-elevated text-ink-muted">
              <tr>
                <th className="px-3 py-2">Wallet</th>
                <th className="px-3 py-2">Deposit TX</th>
                <th className="px-3 py-2">Energy</th>
                <th className="px-3 py-2">Bandwidth</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row) => (
                <tr key={row.id} className="border-t border-white/[0.06]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CopyableText value={row.walletAddress} />
                      <Link
                        href={`/admin/sponsorships/${row.id}`}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {row.depositTxid ? (
                      <CopyableText value={row.depositTxid} left={8} right={4} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(
                      row.energyDelivered ?? row.energyTarget ?? 150_000,
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {formatNumber(
                      row.bandwidthDelivered ?? row.bandwidthTarget ?? 1_000,
                    )}
                  </td>
                  <td className="px-3 py-2">{row.provider ?? "—"}</td>
                  <td className="px-3 py-2">{row.providerCostTrx ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(row.status)}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-muted">
                    {relativeTime(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

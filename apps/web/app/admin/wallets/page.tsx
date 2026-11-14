"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyableText } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { relativeTime } from "@/lib/format";

interface WalletRow {
  id: string;
  address: string;
  network: string;
  status: string;
  createdAt: string;
  _count: {
    deposits: number;
    sponsorshipCredits: number;
  };
}

export default function WalletsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wallets"],
    queryFn: () =>
      apiFetch<{ data: WalletRow[] }>("/admin/wallets?page=1&pageSize=50"),
  });

  return (
    <div>
      <PageHeader
        title="Sender Wallets"
        description="Addresses that made qualifying TRX deposits."
      />
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}
      {error ? (
        <ErrorState
          description="We couldn't load wallets."
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          title="No wallets yet"
          description="Wallets appear after qualifying TRX deposits are detected."
          actionHref="/admin/deposits"
          actionLabel="View Deposits"
        />
      ) : null}

      <div className="space-y-3 md:hidden">
        {data?.data.map((w) => (
          <Link key={w.id} href={`/admin/wallets/${w.address}`}>
            <Card className="mb-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <CopyableText value={w.address} left={6} right={4} />
                <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
                <span>{w.network.toUpperCase()}</span>
                <span>{w._count.deposits} deposits</span>
                <span>{w._count.sponsorshipCredits} sponsorships</span>
                <span>{relativeTime(w.createdAt)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {data && data.data.length > 0 ? (
        <div className="mt-1 hidden overflow-x-auto rounded-2xl border border-white/[0.06] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas-elevated text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Address</th>
                <th className="px-3 py-2 font-medium">Network</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Deposits</th>
                <th className="px-3 py-2 font-medium">Sponsorships</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((w) => (
                <tr key={w.id} className="border-t border-white/[0.06]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CopyableText value={w.address} left={8} right={4} />
                      <Link
                        className="text-xs font-semibold text-accent hover:underline"
                        href={`/admin/wallets/${w.address}`}
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2">{w.network}</td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{w._count.deposits}</td>
                  <td className="px-3 py-2">{w._count.sponsorshipCredits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

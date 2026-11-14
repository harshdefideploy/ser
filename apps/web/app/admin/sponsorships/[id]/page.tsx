"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { CopyableText } from "@/components/ui/copy-button";

export default function SponsorshipDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsorship", params.id],
    queryFn: () =>
      apiFetch<{ credit: { id: string; status: string; wallet: { address: string }; deposit: { txid: string } } }>(
        `/admin/sponsorships/${params.id}`,
      ),
  });

  return (
    <div>
      <PageHeader title="Sponsorship detail" />
      {isLoading ? <p className="text-sm text-ink-muted">Loading…</p> : null}
      {error ? (
        <p className="text-sm text-accent-danger">{(error as Error).message}</p>
      ) : null}
      {data?.credit ? (
        <Card>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(data.credit.status)}>
              {data.credit.status}
            </Badge>
            <span className="font-mono text-xs text-ink-muted">
              {data.credit.id}
            </span>
          </div>
          <p className="mt-4 text-sm text-ink-muted">Wallet</p>
          <CopyableText
            value={data.credit.wallet.address}
            truncate={false}
            className="mt-1"
          />
          <p className="mt-3 text-sm text-ink-muted">Deposit TX</p>
          <CopyableText
            value={data.credit.deposit.txid}
            truncate={false}
            className="mt-1"
          />
        </Card>
      ) : null}
    </div>
  );
}

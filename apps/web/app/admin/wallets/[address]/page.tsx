"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyableText } from "@/components/ui/copy-button";

export default function WalletDetailPage() {
  const params = useParams<{ address: string }>();
  const address = decodeURIComponent(params.address);

  const { data, isLoading, error } = useQuery({
    queryKey: ["wallet", address],
    queryFn: () =>
      apiFetch<{ wallet: Record<string, unknown> }>(
        `/admin/wallets/${encodeURIComponent(address)}`,
      ),
  });

  const wallet = data?.wallet as
    | {
        address: string;
        network: string;
        status: string;
        deposits: Array<{
          id: string;
          txid: string;
          status: string;
          amountTrx: string;
        }>;
        sponsorshipCredits: Array<{ id: string; status: string }>;
      }
    | undefined;

  return (
    <div>
      <PageHeader
        title="Wallet detail"
        description="Qualifying deposits and sponsorship history for a sender address."
      />
      {isLoading ? <p className="text-sm text-ink-muted">Loading…</p> : null}
      {error ? (
        <p className="text-sm text-accent-danger">{(error as Error).message}</p>
      ) : null}
      {wallet ? (
        <div className="space-y-4">
          <Card>
            <p className="text-xs text-ink-muted">Address</p>
            <CopyableText
              value={wallet.address}
              truncate={false}
              className="mt-1"
            />
            <div className="mt-3 flex gap-2">
              <Badge variant="muted">{wallet.network}</Badge>
              <Badge variant={statusVariant(wallet.status)}>
                {wallet.status}
              </Badge>
            </div>
            <a
              className="mt-3 inline-block text-sm text-accent hover:underline"
              href={`https://tronscan.org/#/address/${wallet.address}`}
              target="_blank"
              rel="noreferrer"
            >
              Open on TronScan
            </a>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <p className="text-xs text-ink-muted">Qualifying deposits</p>
              <p className="mt-1 text-xl">{wallet.deposits.length}</p>
            </Card>
            <Card>
              <p className="text-xs text-ink-muted">Sponsorships</p>
              <p className="mt-1 text-xl">{wallet.sponsorshipCredits.length}</p>
            </Card>
          </div>
          {wallet.sponsorshipCredits.length > 0 ? (
            <Card>
              <p className="mb-2 text-xs text-ink-muted">Sponsorship statuses</p>
              <ul className="space-y-1 text-sm">
                {wallet.sponsorshipCredits.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-faint">
                      {c.id.slice(0, 10)}…
                    </span>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

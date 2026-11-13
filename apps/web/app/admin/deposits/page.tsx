"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { tronscanAddressUrl, tronscanTxUrl } from "@/lib/tronscan";
import { relativeTime, shortAddress } from "@/lib/format";

interface DepositRow {
  id: string;
  txid: string;
  fromAddress: string;
  amountTrx: string;
  confirmations: number;
  status: string;
  rejectionReason: string | null;
  detectedAt: string;
  credit: { id: string } | null;
  masterWallet: {
    id: string;
    address: string;
    label: string;
    network: string;
  } | null;
}

export default function DepositsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["deposits"],
    queryFn: () =>
      apiFetch<{ data: DepositRow[] }>("/admin/deposits?page=1&pageSize=50"),
  });

  return (
    <div>
      <PageHeader
        title="Deposits"
        description="Incoming qualifying TRX to master receiving wallets."
      />

      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}
      {error ? (
        <ErrorState
          description="We couldn't load deposits right now."
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          title="No deposits yet"
          description="Incoming qualifying TRX deposits will appear here automatically."
          actionHref="/admin/master-wallets"
          actionLabel="View Master Wallets"
        />
      ) : null}

      <div className="space-y-3 md:hidden">
        {data?.data.map((d) => {
          const blocked = Boolean(d.rejectionReason);
          const receivedBy =
            d.masterWallet?.label ||
            (d.masterWallet?.address
              ? shortAddress(d.masterWallet.address)
              : "Master wallet");
          return (
            <Card
              key={d.id}
              className={
                blocked ? "border-accent-danger/25 bg-accent-danger/[0.04]" : ""
              }
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-2xl font-semibold tracking-tight text-ink">
                  +{d.amountTrx}{" "}
                  <span className="text-base font-medium text-ink-muted">
                    TRX
                  </span>
                </p>
                <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-1 text-ink-muted">
                  <span className="text-ink-faint">From</span>
                  <a
                    className="font-mono text-ink"
                    href={tronscanAddressUrl(d.fromAddress)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddress(d.fromAddress)}
                  </a>
                  <CopyButton value={d.fromAddress} />
                </div>
                <p className="text-ink-muted">
                  Received by{" "}
                  <span className="text-ink">{receivedBy}</span>
                </p>
                {d.rejectionReason ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="danger">BLOCKED</Badge>
                    <Badge variant="danger">{d.rejectionReason}</Badge>
                  </div>
                ) : null}
                <div className="flex items-center gap-1 pt-1 text-xs text-ink-faint">
                  <a
                    className="font-mono text-accent"
                    href={tronscanTxUrl(d.txid)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddress(d.txid, 8, 4)}
                  </a>
                  <CopyButton value={d.txid} />
                  <span>· {relativeTime(d.detectedAt)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {data && data.data.length > 0 ? (
        <div className="mt-1 hidden overflow-x-auto rounded-2xl border border-white/[0.06] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas-elevated text-ink-muted">
              <tr>
                <th className="px-3 py-2">TXID</th>
                <th className="px-3 py-2">Sender</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Received By</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Block Reason</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((d) => {
                const receivedBy =
                  d.masterWallet?.label ||
                  d.masterWallet?.address ||
                  "—";
                return (
                  <tr key={d.id} className="border-t border-white/[0.06]">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <a
                          className="font-mono text-xs text-accent hover:underline"
                          href={tronscanTxUrl(d.txid)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortAddress(d.txid, 8, 4)}
                        </a>
                        <CopyButton value={d.txid} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <a
                          className="font-mono text-xs text-accent hover:underline"
                          href={tronscanAddressUrl(d.fromAddress)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortAddress(d.fromAddress)}
                        </a>
                        <CopyButton value={d.fromAddress} />
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono">{d.amountTrx}</td>
                    <td className="px-3 py-2">
                      {d.masterWallet ? (
                        <div className="flex items-center gap-1">
                          <a
                            className="font-mono text-xs text-accent hover:underline"
                            href={tronscanAddressUrl(d.masterWallet.address)}
                            target="_blank"
                            rel="noreferrer"
                            title={d.masterWallet.address}
                          >
                            {receivedBy.length > 16
                              ? `${receivedBy.slice(0, 12)}…`
                              : receivedBy}
                          </a>
                          <CopyButton value={d.masterWallet.address} />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(d.status)}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {d.rejectionReason ? (
                        <Badge variant="danger">{d.rejectionReason}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-muted">
                      {relativeTime(d.detectedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

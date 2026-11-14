"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, statusVariant } from "@/components/ui/badge";
import { CopyableText } from "@/components/ui/copy-button";

interface OrderRow {
  id: string;
  resourceType: string;
  status: string;
  requestedAmount: string;
  deliveredAmount: string | null;
  providerCostTrx: string | null;
  wallet: { address: string };
}

export default function OrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["orders"],
    queryFn: () =>
      apiFetch<{ data: OrderRow[] }>("/admin/orders?page=1&pageSize=50"),
  });

  return (
    <div>
      <PageHeader
        title="Provider orders"
        description="Energy and Bandwidth orders placed with GetGas. Click any address to copy."
      />
      {isLoading ? <p className="text-sm text-ink-muted">Loading…</p> : null}
      {error ? (
        <p className="text-sm text-accent-danger">{(error as Error).message}</p>
      ) : null}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          title="No provider orders"
          description="Orders are created during provisioning in Phase 3."
        />
      ) : null}
      {data && data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-canvas-border bg-white shadow-card">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas-soft text-ink-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">Wallet</th>
                <th className="px-3 py-3 font-semibold">Resource</th>
                <th className="px-3 py-3 font-semibold">Requested</th>
                <th className="px-3 py-3 font-semibold">Delivered</th>
                <th className="px-3 py-3 font-semibold">Cost</th>
                <th className="px-3 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((o) => (
                <tr key={o.id} className="border-t border-canvas-border">
                  <td className="px-3 py-2.5">
                    <CopyableText value={o.wallet.address} left={8} right={6} />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-ink">
                    {o.resourceType}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{o.requestedAmount}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {o.deliveredAmount ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {o.providerCostTrx ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
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

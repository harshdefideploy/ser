"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, statusVariant } from "@/components/ui/badge";

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
        description="Energy and Bandwidth orders placed with GetGas."
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
        <div className="overflow-x-auto rounded-lg border border-canvas-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas-elevated text-ink-muted">
              <tr>
                <th className="px-3 py-2">Wallet</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">Delivered</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((o) => (
                <tr key={o.id} className="border-t border-canvas-border">
                  <td className="px-3 py-2 font-mono text-xs">
                    {o.wallet.address}
                  </td>
                  <td className="px-3 py-2">{o.resourceType}</td>
                  <td className="px-3 py-2">{o.requestedAmount}</td>
                  <td className="px-3 py-2">{o.deliveredAmount ?? "—"}</td>
                  <td className="px-3 py-2">{o.providerCostTrx ?? "—"}</td>
                  <td className="px-3 py-2">
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

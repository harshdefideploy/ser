"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

interface AuditRow {
  id: string;
  action: string;
  entityType: string | null;
  createdAt: string;
  admin: { email: string } | null;
  ipAddress: string | null;
}

export default function AuditPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: () =>
      apiFetch<{ data: AuditRow[] }>("/admin/audit?page=1&pageSize=50"),
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Admin and system actions for accountability."
      />
      {isLoading ? <p className="text-sm text-ink-muted">Loading…</p> : null}
      {error ? (
        <p className="text-sm text-accent-danger">{(error as Error).message}</p>
      ) : null}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          title="No audit events"
          description="Login and settings changes will appear here."
        />
      ) : null}
      {data && data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-canvas-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas-elevated text-ink-muted">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row) => (
                <tr key={row.id} className="border-t border-canvas-border">
                  <td className="px-3 py-2 text-xs text-ink-muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2">{row.admin?.email ?? "—"}</td>
                  <td className="px-3 py-2">{row.entityType ?? "—"}</td>
                  <td className="px-3 py-2">{row.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

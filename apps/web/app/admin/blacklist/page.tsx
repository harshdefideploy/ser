"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton, CopyableText } from "@/components/ui/copy-button";
import { Sheet } from "@/components/ui/sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { tronscanAddressUrl } from "@/lib/tronscan";
import { relativeTime, shortAddress } from "@/lib/format";

interface BlacklistRow {
  id: string;
  address: string;
  reason: string;
  active: boolean;
  createdAt: string;
  createdBy: string | null;
  removedAt: string | null;
  removedBy: string | null;
}

export default function BlacklistPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["blacklist", q],
    queryFn: () =>
      apiFetch<{ data: BlacklistRow[] }>(
        `/admin/blacklist${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      ),
  });

  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    id: string;
    active: boolean;
  } | null>(null);

  const activeCount = data?.data.filter((r) => r.active).length ?? 0;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["blacklist"] });
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setMessage("Reason is required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/admin/blacklist", {
        method: "POST",
        body: JSON.stringify({ address, reason }),
      });
      setAddress("");
      setReason("");
      setShowForm(false);
      setMessage("Wallet blocked.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/blacklist/${confirm.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: confirm.active }),
      });
      setConfirm(null);
      setMessage(confirm.active ? "Entry activated." : "Entry deactivated.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Security Center"
        description="Block sender wallets from receiving sponsorship."
        action={
          <Button type="button" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Block
          </Button>
        }
      />

      <Card className="mb-4 flex items-center gap-3 border-accent-success/20">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-success/15 text-accent-success">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-success pulse-dot" />
            <p className="font-medium text-ink">Protection active</p>
          </div>
          <p className="text-xs text-ink-muted">
            {activeCount === 1
              ? "1 active blocked wallet"
              : `${activeCount} active blocked wallets`}
          </p>
        </div>
      </Card>

      <Input
        className="mb-4"
        placeholder="Search address or reason"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {message ? (
        <p className="mb-3 text-sm text-accent-success">{message}</p>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}
      {error ? <ErrorState onRetry={() => void refetch()} /> : null}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          title="No blacklist entries"
          description="Add a sender address to prevent sponsorship for future deposits."
        />
      ) : null}

      <div className="space-y-3">
        {data?.data.map((row) => (
          <Card key={row.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  Blocked wallet
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <CopyableText value={row.address} left={6} right={4} />
                  <a
                    className="text-xs font-semibold text-accent hover:underline"
                    href={tronscanAddressUrl(row.address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    TronScan
                  </a>
                </div>
              </div>
              <Badge
                variant={statusVariant(row.active ? "ACTIVE" : "INACTIVE")}
              >
                {row.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-ink-muted">{row.reason}</p>
            <p className="text-xs text-ink-faint">
              Added {relativeTime(row.createdAt)}
              {row.createdBy ? ` · by ${row.createdBy.slice(0, 8)}…` : ""}
            </p>
            <div className="flex gap-2">
              {row.active ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirm({ id: row.id, active: false })}
                >
                  Remove
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirm({ id: row.id, active: true })}
                >
                  Activate
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Block Wallet"
      >
        <form className="space-y-3" onSubmit={(e) => void onAdd(e)}>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">
              Wallet Address
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="T…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Reason</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Suspicious activity"
            />
          </div>
          <Button type="submit" className="w-full" variant="danger" disabled={busy}>
            {busy ? "Blocking…" : "Block Wallet"}
          </Button>
        </form>
      </Sheet>

      <ConfirmSheet
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.active ? "Activate blacklist?" : "Remove from blacklist?"}
        description={
          confirm?.active
            ? "Future deposits from this wallet will be blocked."
            : "Future deposits may qualify. Previously blocked deposits stay blocked."
        }
        danger={!confirm?.active}
        confirmLabel={confirm?.active ? "Activate" : "Deactivate"}
        loading={busy}
        onConfirm={runConfirm}
      />
    </div>
  );
}

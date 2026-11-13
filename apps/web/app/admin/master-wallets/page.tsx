"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { Sheet } from "@/components/ui/sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { tronscanAddressUrl } from "@/lib/tronscan";
import { relativeTime, shortAddress } from "@/lib/format";

interface MasterWalletRow {
  id: string;
  address: string;
  label: string;
  network: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { deposits: number };
}

export default function MasterWalletsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["master-wallets"],
    queryFn: () =>
      apiFetch<{ data: MasterWalletRow[] }>("/admin/master-wallets"),
  });

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("mainnet");
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    id: string;
    kind: "enable" | "disable" | "delete";
  } | null>(null);
  const [editLabel, setEditLabel] = useState<MasterWalletRow | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["master-wallets"] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/admin/master-wallets", {
        method: "POST",
        body: JSON.stringify({ label, address, network, enabled }),
      });
      setLabel("");
      setAddress("");
      setShowForm(false);
      setMessage("Master wallet added.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "delete") {
        const res = await apiFetch<{ message?: string }>(
          `/admin/master-wallets/${confirm.id}`,
          { method: "DELETE" },
        );
        setMessage(res.message ?? "Done.");
      } else {
        await apiFetch(`/admin/master-wallets/${confirm.id}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: confirm.kind === "enable" }),
        });
      }
      setConfirm(null);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveLabel() {
    if (!editLabel) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/master-wallets/${editLabel.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: labelDraft }),
      });
      setEditLabel(null);
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
        title="Master Wallets"
        description="Receiving addresses monitored for inbound TRX."
        action={
          <Button
            type="button"
            className="min-h-touch"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
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
      {error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : null}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          title="No master wallets"
          description="Add a receiving TRON address to start monitoring inbound TRX."
        />
      ) : null}

      <div className="space-y-3 md:hidden">
        {data?.data.map((row) => (
          <Card key={row.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  {row.label || "Receiver"}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <p className="font-mono text-base text-ink">
                    {shortAddress(row.address, 6, 4)}
                  </p>
                  <CopyButton value={row.address} />
                </div>
              </div>
              <Badge
                variant={statusVariant(row.enabled ? "ACTIVE" : "INACTIVE")}
              >
                {row.enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
              <Badge variant="muted">{row.network.toUpperCase()}</Badge>
              <span>{row._count?.deposits ?? 0} deposits</span>
              <span>{relativeTime(row.updatedAt)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setConfirm({
                    id: row.id,
                    kind: row.enabled ? "disable" : "enable",
                  })
                }
              >
                {row.enabled ? "Disable" : "Enable"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditLabel(row);
                  setLabelDraft(row.label);
                }}
              >
                Edit
              </Button>
              <a
                href={tronscanAddressUrl(row.address)}
                target="_blank"
                rel="noreferrer"
                className="pressable inline-flex min-h-touch items-center gap-1 rounded-xl px-3 text-sm text-accent"
              >
                TronScan <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </Card>
        ))}
      </div>

      {data && data.data.length > 0 ? (
        <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-white/[0.06] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-canvas-elevated text-ink-muted">
              <tr>
                <th className="px-3 py-2">Wallet</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Deposits</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((row) => (
                <tr key={row.id} className="border-t border-white/[0.06]">
                  <td className="px-3 py-2 font-mono text-xs">
                    <div className="flex items-center gap-1">
                      {shortAddress(row.address, 8, 4)}
                      <CopyButton value={row.address} />
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.label || "—"}</td>
                  <td className="px-3 py-2">{row.network}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={statusVariant(
                        row.enabled ? "ACTIVE" : "INACTIVE",
                      )}
                    >
                      {row.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{row._count?.deposits ?? 0}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setConfirm({
                            id: row.id,
                            kind: row.enabled ? "disable" : "enable",
                          })
                        }
                      >
                        {row.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() =>
                          setConfirm({ id: row.id, kind: "delete" })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Master Wallet"
      >
        <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Label</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">
              TRON Address
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Network</label>
            <select
              className="min-h-touch w-full rounded-xl border border-white/10 bg-canvas-soft px-4 text-sm"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option value="mainnet">mainnet</option>
              <option value="shasta">shasta</option>
              <option value="nile">nile</option>
            </select>
          </div>
          <label className="flex min-h-touch items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enabled (monitoring)
          </label>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save wallet"}
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={Boolean(editLabel)}
        onClose={() => setEditLabel(null)}
        title="Edit label"
      >
        <div className="space-y-3">
          <Input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
          />
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={() => void saveLabel()}
          >
            Save
          </Button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === "delete"
            ? "Remove wallet?"
            : confirm?.kind === "disable"
              ? "Disable wallet?"
              : "Enable wallet?"
        }
        description={
          confirm?.kind === "delete"
            ? "Wallets with deposit history will be disabled instead of deleted."
            : "This changes monitoring for inbound TRX on this address."
        }
        danger={confirm?.kind === "delete" || confirm?.kind === "disable"}
        confirmLabel={
          confirm?.kind === "delete"
            ? "Confirm"
            : confirm?.kind === "disable"
              ? "Disable"
              : "Enable"
        }
        loading={busy}
        onConfirm={runConfirm}
      />
    </div>
  );
}

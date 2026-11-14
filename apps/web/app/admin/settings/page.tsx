"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Landmark,
  Network,
  Shield,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ErrorState } from "@/components/ui/error-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { SystemSettingsDto } from "@tron-gas-sponsor/shared";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      apiFetch<{ settings: SystemSettingsDto }>("/admin/settings"),
  });

  const [form, setForm] = useState<Partial<SystemSettingsDto>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<Partial<SystemSettingsDto> | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  function set<K extends keyof SystemSettingsDto>(
    key: K,
    value: SystemSettingsDto[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPendingPayload(form);
    setConfirmOpen(true);
  }

  async function saveConfirmed() {
    if (!pendingPayload) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ ...pendingPayload, confirmDangerous: true }),
      });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      setMessage("Settings saved.");
      setConfirmOpen(false);
      setPendingPayload(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Account, security, network, and system controls."
      />

      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}
      {error ? (
        <ErrorState
          description="We couldn't load settings."
          onRetry={() => void refetch()}
        />
      ) : null}

      {form.minimumQualifyingTrx !== undefined ? (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <SettingsSection
            icon={<User className="h-4 w-4" />}
            title="Account"
          >
            <SettingsRow
              label="Admin console"
              value="Signed in"
              hint="Session managed via API auth"
            />
          </SettingsSection>

          <SettingsSection
            icon={<Shield className="h-4 w-4" />}
            title="Security"
          >
            <Link href="/admin/blacklist" className="block">
              <SettingsRow
                label="Blacklist"
                value="Manage"
                chevron
              />
            </Link>
          </SettingsSection>

          <SettingsSection
            icon={<Network className="h-4 w-4" />}
            title="Network"
          >
            <Field
              label="Confirmations required"
              value={String(form.confirmationsRequired ?? "")}
              onChange={(v) => set("confirmationsRequired", Number(v))}
            />
            <Field
              label="Monitor interval (ms)"
              value={String(form.monitorIntervalMs ?? "")}
              onChange={(v) => set("monitorIntervalMs", Number(v))}
            />
            <Field
              label="GetGas term"
              value={form.providerTerm ?? "1h"}
              onChange={(v) =>
                set("providerTerm", v === "15m" ? "15m" : "1h")
              }
            />
          </SettingsSection>

          <SettingsSection
            icon={<Landmark className="h-4 w-4" />}
            title="Master Wallets"
          >
            <Link href="/admin/master-wallets" className="block">
              <SettingsRow
                label="Receiving wallets"
                value="Open"
                chevron
              />
            </Link>
            <p className="px-1 text-xs text-ink-faint">
              Receiving wallets are managed under Master Wallets. The legacy
              address below is kept for compatibility.
            </p>
            <Field
              label="Legacy master address (compat)"
              value={form.masterWalletAddress ?? ""}
              onChange={(v) => set("masterWalletAddress", v)}
            />
          </SettingsSection>

          <SettingsSection
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title="System"
          >
            <Field
              label="Minimum qualifying TRX"
              value={form.minimumQualifyingTrx ?? ""}
              onChange={(v) => set("minimumQualifyingTrx", v)}
            />
            <Field
              label="Energy target"
              value={String(form.energyTarget ?? "")}
              onChange={(v) => set("energyTarget", Number(v))}
            />
            <Field
              label="Bandwidth target"
              value={String(form.bandwidthTarget ?? "")}
              onChange={(v) => set("bandwidthTarget", Number(v))}
            />
            <p className="px-1 text-xs text-ink-faint">
              Energy and Bandwidth are a fixed package per credit. Existing
              wallet resources are never inspected.
            </p>
            <Field
              label="Provider order max retries"
              value={String(form.providerOrderMaxRetries ?? "")}
              onChange={(v) => set("providerOrderMaxRetries", Number(v))}
            />
            <Field
              label="Sponsorship expiry (hours)"
              value={String(form.sponsorshipExpiryHours ?? "")}
              onChange={(v) => set("sponsorshipExpiryHours", Number(v))}
            />
            <Field
              label="Daily provider limit (TRX)"
              value={form.dailyProviderLimitTrx ?? ""}
              onChange={(v) => set("dailyProviderLimitTrx", v)}
            />
            <Field
              label="Monthly provider limit (TRX)"
              value={form.monthlyProviderLimitTrx ?? ""}
              onChange={(v) => set("monthlyProviderLimitTrx", v)}
            />
          </SettingsSection>

          <div className="flex items-center gap-3 pb-2">
            <Button type="submit" className="min-h-touch w-full sm:w-auto" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
            {message ? (
              <p className="text-sm text-accent-success">{message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      <Card className="mt-4 space-y-3 border-accent-danger/30 bg-accent-danger/5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-danger/10 text-accent-danger">
            <Trash2 className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Clear operational data</p>
            <p className="mt-1 text-sm text-ink-muted">
              Wipe deposits, sponsorships, orders, sender wallets, analytics, and
              audit logs. Keeps admin login, settings, master wallets, and
              blacklist. Use this after switching GetGas / admin accounts.
            </p>
            {clearMsg ? (
              <p className="mt-2 text-sm text-accent-success">{clearMsg}</p>
            ) : null}
            <Button
              type="button"
              variant="danger"
              className="mt-3 min-h-touch"
              onClick={() => {
                setClearMsg(null);
                setClearOpen(true);
              }}
            >
              Clear data…
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingPayload(null);
        }}
        title="Save settings?"
        description="Confirm changes to operational and provider-related settings."
        confirmLabel="Save changes"
        loading={saving}
        onConfirm={saveConfirmed}
      />

      <ConfirmSheet
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear all operational data?"
        description="This permanently deletes deposits, sponsorships, provider orders, sender wallets, analytics, and audit history. Master wallets and settings stay. This cannot be undone."
        confirmLabel="Clear data"
        danger
        loading={clearing}
        onConfirm={async () => {
          setClearing(true);
          setClearMsg(null);
          try {
            const res = await apiFetch<{
              ok: boolean;
              cleared: Record<string, number>;
            }>("/admin/clear-data", {
              method: "POST",
              body: JSON.stringify({ confirm: "CLEAR_OPERATIONAL_DATA" }),
            });
            setClearMsg(
              `Cleared ${res.cleared.deposits ?? 0} deposits, ${res.cleared.sponsorshipCredits ?? 0} credits, ${res.cleared.providerOrders ?? 0} orders.`,
            );
            setClearOpen(false);
            await queryClient.invalidateQueries();
          } catch (err) {
            setClearMsg(err instanceof Error ? err.message : "Clear failed");
          } finally {
            setClearing(false);
          }
        }}
      />
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-1 !p-2">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="text-accent">{icon}</span>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          {title}
        </p>
      </div>
      <div className="space-y-1">{children}</div>
    </Card>
  );
}

function SettingsRow({
  label,
  value,
  hint,
  chevron,
}: {
  label: string;
  value: string;
  hint?: string;
  chevron?: boolean;
}) {
  return (
    <div className="pressable flex min-h-touch items-center justify-between gap-3 rounded-xl px-3 py-2">
      <div>
        <p className="text-sm text-ink">{label}</p>
        {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-1 text-sm text-ink-muted">
        <span>{value}</span>
        {chevron ? <ChevronRight className="h-4 w-4 text-ink-faint" /> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="px-2 py-2">
      <label className="mb-1.5 block text-xs text-ink-muted">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { greeting } from "@/lib/format";

interface DashboardResponse {
  network: string;
  appEnv: string;
  stats?: { failedSponsorships?: number };
}

export function AppHeader() {
  const { data } = useQuery({
    queryKey: ["dashboard-header"],
    queryFn: () => apiFetch<DashboardResponse>("/admin/dashboard"),
    staleTime: 15_000,
    retry: false,
  });

  const network = (data?.network ?? "—").toUpperCase();
  const healthy = (data?.stats?.failedSponsorships ?? 0) === 0;

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/[0.06] glass pt-safe md:hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-sm text-accent shadow-glow">
              ✦
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-ink">
                TRON Gas
              </p>
              <p className="text-[11px] text-ink-faint">
                {greeting()}, Admin
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-ink-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-accent-success pulse-dot" : "bg-accent-warning"}`}
            />
            {network}
          </span>
        </div>
      </div>
    </header>
  );
}

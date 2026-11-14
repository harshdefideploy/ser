"use client";

import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-canvas-border/80 glass pt-safe md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-glow">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold tracking-tight text-ink">
                TRON Gas
              </p>
              <p className="text-[11px] text-ink-faint">
                {greeting()}, Admin
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-canvas-border bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-muted shadow-sm">
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

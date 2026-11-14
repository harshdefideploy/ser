"use client";

import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AppHeader } from "./app-header";
import { Button } from "../ui/button";
import { LiveAtmosphere, LiveBadge } from "../ui/live-atmosphere";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-screen min-h-dvh bg-transparent text-ink">
      <LiveAtmosphere />
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <header className="hidden items-center justify-between border-b border-canvas-border/80 bg-white/70 px-6 py-3 backdrop-blur md:flex">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-display text-sm font-semibold text-ink">
                Resource sponsorship control plane
              </p>
              <p className="text-xs text-ink-muted">
                Monitor deposits, sponsorships, and GetGas delivery
              </p>
            </div>
            <LiveBadge />
          </div>
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </header>
        <main className="flex-1 overflow-auto px-4 py-4 md:p-6 pb-nav md:pb-8">
          <div className="mx-auto w-full max-w-6xl animate-enter">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

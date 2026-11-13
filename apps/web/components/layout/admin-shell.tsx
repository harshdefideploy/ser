"use client";

import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AppHeader } from "./app-header";
import { Button } from "../ui/button";
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
    <div className="flex min-h-screen min-h-dvh bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <header className="hidden items-center justify-between border-b border-white/[0.06] px-6 py-3 md:flex">
          <p className="text-sm text-ink-muted">
            Resource sponsorship control plane
          </p>
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </header>
        <main className="flex-1 overflow-auto px-4 py-4 md:p-6 pb-nav md:pb-6">
          <div className="mx-auto w-full max-w-6xl animate-enter">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

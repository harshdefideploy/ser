"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  BarChart3,
  Plug,
  Settings,
  ScrollText,
  ShoppingCart,
  Wallet,
  LogOut,
  ChevronRight,
  CircleHelp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api";

const rows = [
  { href: "/admin/blacklist", label: "Blacklist", icon: Ban, hint: "Security center" },
  { href: "/admin/wallets", label: "Sender wallets", icon: Wallet, hint: "Deposit senders" },
  { href: "/admin/providers", label: "Providers", icon: Plug, hint: "GetGas status" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, hint: "Provider orders" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, hint: "Trends" },
  { href: "/admin/settings", label: "Settings", icon: Settings, hint: "System knobs" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, hint: "Admin actions" },
  { href: "/help", label: "Help & policies", icon: CircleHelp, hint: "Help, terms, privacy" },
];

export default function MorePage() {
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
    <div>
      <PageHeader
        title="More"
        description="Security, settings, and advanced operations."
      />
      <div className="card-premium divide-y divide-white/[0.06] overflow-hidden p-0">
        {rows.map(({ href, label, icon: Icon, hint }) => (
          <Link
            key={href}
            href={href}
            className="pressable flex min-h-touch items-center gap-3 px-4 py-3.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-accent">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-ink">{label}</span>
              <span className="block text-xs text-ink-faint">{hint}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-faint" />
          </Link>
        ))}
        <button
          type="button"
          onClick={() => void logout()}
          className="pressable flex min-h-touch w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-danger/10 text-accent-danger">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-medium text-ink">Sign out</span>
            <span className="block text-xs text-ink-faint">End this session</span>
          </span>
        </button>
      </div>
    </div>
  );
}

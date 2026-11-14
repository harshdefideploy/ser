"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  ArrowDownToLine,
  BadgeCheck,
  Ban,
  Plug,
  ShoppingCart,
  BarChart3,
  Settings,
  ScrollText,
  Menu,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/master-wallets", label: "Master Wallets", icon: Landmark },
  { href: "/admin/wallets", label: "Senders", icon: Wallet },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/admin/sponsorships", label: "Sponsorships", icon: BadgeCheck },
  { href: "/admin/blacklist", label: "Blacklist", icon: Ban },
  { href: "/admin/providers", label: "Providers", icon: Plug },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
  { href: "/admin/more", label: "More", icon: Menu },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-canvas-border bg-white/90 md:flex">
      <div className="border-b border-canvas-border px-5 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-glow">
            <Zap className="h-5 w-5" fill="currentColor" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              TRON Gas
            </p>
            <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
              Sponsor Ops
            </h1>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-touch items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-accent text-white shadow-glow"
                  : "text-ink-muted hover:bg-accent-soft hover:text-accent",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-white" : "text-accent/80")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-canvas-border p-4">
        <div className="rounded-2xl bg-gradient-to-br from-accent-soft to-white p-3 ring-1 ring-blue-100">
          <p className="text-xs font-semibold text-accent">Auto top-up live</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            Deposits ≥ 0.1 TRX provision energy + bandwidth automatically.
          </p>
        </div>
      </div>
    </aside>
  );
}

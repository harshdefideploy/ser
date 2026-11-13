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
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-white/[0.06] bg-canvas-elevated/80 md:flex">
      <div className="border-b border-white/[0.06] px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-glow">
            ✦
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
              TRON Gas
            </p>
            <h1 className="text-lg font-semibold text-ink">Sponsor Ops</h1>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
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
                "flex min-h-touch items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-accent/15 text-accent shadow-glow"
                  : "text-ink-muted hover:bg-white/5 hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

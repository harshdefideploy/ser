"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ArrowDownToLine,
  BadgeCheck,
  Landmark,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Home", icon: Home, exact: true },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/admin/sponsorships", label: "Sponsors", icon: BadgeCheck },
  { href: "/admin/master-wallets", label: "Wallets", icon: Landmark },
  { href: "/admin/more", label: "More", icon: Menu },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] glass md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch justify-around px-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "pressable relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                  active ? "text-accent" : "text-ink-faint",
                )}
              >
                {active ? (
                  <span className="absolute top-1 h-1 w-6 rounded-full bg-accent shadow-glow" />
                ) : null}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    active && "scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]",
                  )}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

type MeResponse = {
  user: { id: string; email: string; role: string };
};

/**
 * Blocks admin UI until a valid session exists.
 * Unauthenticated visitors are sent to /login.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await apiFetch<MeResponse>("/auth/me");
        if (!cancelled) {
          setAllowed(true);
          setReady(true);
        }
      } catch {
        if (cancelled) return;
        setAllowed(false);
        setReady(true);
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/login?next=${next}`);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-blue-mesh px-4">
        <div className="card-premium w-full max-w-sm p-6 text-center shadow-float">
          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-2xl bg-accent/15" />
          <p className="font-display text-base font-semibold text-ink">
            Checking access…
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Admin pages require email and password.
          </p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}

export function useRequireGuest() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        await apiFetch<MeResponse>("/auth/me");
        if (!cancelled) {
          router.replace("/admin");
        }
      } catch (err) {
        if (!cancelled) {
          // Expected when logged out
          if (!(err instanceof ApiError && err.status === 401)) {
            // keep login form visible even on other errors
          }
          setChecking(false);
        }
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return checking;
}

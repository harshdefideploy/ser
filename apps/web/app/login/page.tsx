"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't sign you in. Check your credentials and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-float">
            <Zap className="h-7 w-7" fill="currentColor" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            TRON Gas Sponsor
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Secure ops access. Public addresses only — never private keys.
          </p>
        </div>
        <form
          className="card-premium space-y-4 p-6 shadow-float"
          onSubmit={(e) => void onSubmit(e)}
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-accent-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full min-h-touch" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <nav className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-medium text-ink-faint">
          <a className="hover:text-accent" href="/help">
            Help
          </a>
          <a className="hover:text-accent" href="/terms">
            Terms
          </a>
          <a className="hover:text-accent" href="/privacy">
            Privacy
          </a>
          <a className="hover:text-accent" href="/risk-disclosure">
            Risk
          </a>
        </nav>
      </div>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import logo from "@/app/(public)/img/Logo.jpeg";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      // Redirect to dashboard (or wherever they came from)
      router.replace(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + school name */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src={logo}
            alt="Kigumo Bendera Senior School crest"
            width={64}
            height={64}
            className="rounded-full mb-3"
            priority
          />
          <h1 className="text-xl font-bold text-primary text-center">
            Kigumo Bendera
          </h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">
            Dorm Management System
          </p>
        </div>

        {/* Card */}
        <div className="border border-primary/15 rounded-sm p-6">
          <h2 className="text-base font-semibold text-primary mb-5">
            Staff Login
          </h2>

          {error && (
            <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-text mb-1">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.ac.ke"
                required
                className="w-full border border-primary/20 rounded-sm px-3 py-2 text-sm bg-neutral text-neutral-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-text mb-1">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-primary/20 rounded-sm px-3 py-2 text-sm bg-neutral text-neutral-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-neutral font-semibold py-2.5 rounded-sm text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-xs text-neutral-text/50 hover:text-accent transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-text/30 mt-6">
          &copy; {new Date().getFullYear()} Kigumo Bendera Senior School
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logo from "@/app/(public)/img/Logo.jpeg";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      setDone(true);
      setTimeout(() => router.replace("/login"), 3000);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <div className="text-3xl">⚠️</div>
        <p className="text-sm text-red-600">Invalid reset link — no token found.</p>
        <Link href="/forgot-password" className="text-sm text-primary underline">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src={logo} alt="School crest" width={56} height={56} className="rounded-full mb-3" />
          <h1 className="text-xl font-bold text-primary">Set New Password</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Kigumo Bendera Dorm System</p>
        </div>

        <div className="border border-primary/15 rounded-sm p-6">
          {done ? (
            <div className="text-center space-y-3">
              <div className="text-3xl">✅</div>
              <p className="text-sm font-medium text-primary">Password updated!</p>
              <p className="text-xs text-neutral-text/60">Redirecting to login in 3 seconds…</p>
              <Link href="/login" className="text-sm text-primary underline">Go to login now</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">New password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" required minLength={8}
                    className="w-full border border-primary/20 rounded-sm px-3 py-2 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">Confirm password</label>
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password" required
                    className="w-full border border-primary/20 rounded-sm px-3 py-2 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-neutral font-semibold py-2.5 rounded-sm text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {loading ? "Saving…" : "Set New Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

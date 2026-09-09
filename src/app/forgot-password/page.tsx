"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/app/(public)/img/Logo.jpeg";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src={logo} alt="School crest" width={56} height={56} className="rounded-full mb-3" />
          <h1 className="text-xl font-bold text-primary">Reset Password</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Kigumo Bendera Dorm System</p>
        </div>

        <div className="border border-primary/15 rounded-sm p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="text-3xl">📧</div>
              <p className="text-sm font-medium text-primary">Check your email</p>
              <p className="text-xs text-neutral-text/60">
                If that email is registered, a reset link has been sent. Check your inbox (and spam folder).
                The link expires in 1 hour.
              </p>
              <Link href="/login" className="inline-block mt-2 text-sm text-primary underline hover:text-accent transition-colors">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-text/70 mb-4">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              {error && (
                <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-text mb-1">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.ac.ke" required
                    className="w-full border border-primary/20 rounded-sm px-3 py-2 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-neutral font-semibold py-2.5 rounded-sm text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link href="/login" className="text-xs text-neutral-text/50 hover:text-accent transition-colors">← Back to login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

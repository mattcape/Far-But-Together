"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import { FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );

    setBusy(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={
        <Link
          href="/login"
          className={`font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
        >
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="font-semibold text-ink">
          If an account exists for {email.trim()}, a reset link is on its way.
          Check your inbox and spam folder.
        </p>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="email" className="mb-1 block font-semibold text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className={INPUT}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-rose-deep">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={`${PRIMARY_BUTTON} mt-6 w-full`}
          >
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

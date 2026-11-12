"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import { FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function signUp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    // If email confirmation is off, we're signed in already: set a name next.
    if (data.session) {
      window.location.href = "/onboarding";
      return;
    }

    // Otherwise they need to confirm by email first.
    setNotice(
      "Account created. Check your email to confirm it, then log in."
    );
    setBusy(false);
  }

  return (
    <AuthCard
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className={`font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={signUp}>
        <label htmlFor="email" className="mb-1 block font-semibold text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className={`${INPUT} mb-4`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label
          htmlFor="password"
          className="mb-1 block font-semibold text-ink"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={INPUT}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-sm text-ink/70">At least 6 characters.</p>

        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-rose-deep">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p role="status" className="mt-3 text-sm font-semibold text-ink">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className={`${PRIMARY_BUTTON} mt-6 w-full`}
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

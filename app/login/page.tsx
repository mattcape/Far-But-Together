"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import { FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    // New accounts have no display name yet, so finish setting up first.
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", data.user.id)
      .maybeSingle();

    window.location.href = profile?.display_name
      ? "/dashboard"
      : "/onboarding";
  }

  return (
    <AuthCard
      title="Log in"
      footer={
        <>
          New here?{" "}
          <Link
            href="/register"
            className={`font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={login}>
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
          autoComplete="current-password"
          required
          className={INPUT}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}

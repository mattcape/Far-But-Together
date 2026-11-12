"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import { FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

export default function ResetPasswordPage() {
  // "checking" until we know whether the reset link was valid.
  const [state, setState] = useState<"checking" | "ready" | "invalid">(
    "checking"
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setState("ready");
      }
    });

    // The link signs you in a moment after the page opens. If that never
    // happens, the link was expired or already used.
    const timer = window.setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        setState((current) =>
          current === "checking" ? (data.session ? "ready" : "invalid") : current
        );
      });
    }, 2500);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <AuthCard title="Choose a new password">
      {state === "checking" ? (
        <p role="status" className="text-ink/75">
          Checking your link...
        </p>
      ) : state === "invalid" ? (
        <p className="text-ink/85">
          This reset link has expired or was already used.{" "}
          <Link
            href="/forgot-password"
            className={`font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
          >
            Send a new one
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="new-password" className="mb-1 block font-semibold text-ink">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            className={`${INPUT} mb-4`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label htmlFor="confirm-password" className="mb-1 block font-semibold text-ink">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            className={INPUT}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
            {busy ? "Saving..." : "Save new password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}

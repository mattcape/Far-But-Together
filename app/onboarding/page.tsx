"use client";

import { useEffect, useState, type FormEvent } from "react";
import AuthCard from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import { INPUT, PRIMARY_BUTTON } from "@/lib/ui";

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Send logged-out visitors to log in, and fill in any name already saved.
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.display_name) setDisplayName(profile.display_name);
    }

    load();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError("");

    const name = displayName.trim();

    if (!name) {
      setError("Enter the name you'd like your partner to see.");
      return;
    }

    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", user.id)
      .select("id");

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    // No profile row yet? Create one.
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, display_name: name });

      if (insertError) {
        setError(insertError.message);
        setBusy(false);
        return;
      }
    }

    window.location.href = "/dashboard";
  }

  return (
    <AuthCard
      title="What should we call you?"
      subtitle="This is the name your partner and friends will see."
    >
      <form onSubmit={saveProfile}>
        <label
          htmlFor="display-name"
          className="mb-1 block font-semibold text-ink"
        >
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          autoComplete="nickname"
          maxLength={40}
          className={INPUT}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
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
          {busy ? "Saving..." : "Continue"}
        </button>
      </form>
    </AuthCard>
  );
}

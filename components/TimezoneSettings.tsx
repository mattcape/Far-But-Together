"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CARD, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

function allZones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };

  return intl.supportedValuesOf?.("timeZone") ?? [];
}

// Lets your partner see your local time on their dashboard.
export default function TimezoneSettings() {
  const [zone, setZone] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const list = allZones();

      setZones(
        detected && !list.includes(detected) ? [detected, ...list] : list
      );
      setZone(data?.timezone || detected || "");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ timezone: zone })
      .eq("id", user.id);

    setBusy(false);
    setFailed(!!error);
    setMessage(error ? error.message : "Saved. Your partner will see your local time.");
  }

  if (zones.length === 0) return null;

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="font-display text-2xl text-ink">Time zone</h2>
      <p className="mt-2 text-ink/75">
        Your partner sees your local time on their dashboard.
      </p>

      <label htmlFor="timezone" className="mb-1 mt-4 block font-semibold text-ink">
        Your time zone
      </label>
      <select
        id="timezone"
        className={INPUT}
        value={zone}
        onChange={(e) => setZone(e.target.value)}
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <button type="button" onClick={save} disabled={busy} className={`${PRIMARY_BUTTON} mt-4`}>
        {busy ? "Saving..." : "Save time zone"}
      </button>

      {message ? (
        <p
          role={failed ? "alert" : "status"}
          className={`mt-3 text-sm font-semibold ${failed ? "text-rose-deep" : "text-ink"}`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

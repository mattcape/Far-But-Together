"use client";

import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { myTimeZone } from "@/lib/tz";
import { CARD, SECONDARY_BUTTON } from "@/lib/ui";
import { getCurrentUser } from "@/lib/auth";

// Downloads a copy of your data as a JSON file. Tables that don't exist yet
// are skipped, so this works whichever features you have set up.
export default function DataExport() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function download() {
    setBusy(true);
    setMessage("");

    try {
      const user = await getCurrentUser();

      if (!user) return;

      const { data: relationships } = await supabase
        .from("relationships")
        .select("id, anniversary, user_one, user_two")
        .or(`user_one.eq.${user.id},user_two.eq.${user.id}`);

      const ids = (relationships ?? []).map((r) => r.id);

      async function rows(
        table: string,
        column: string,
        values: (string | number)[]
      ) {
        if (values.length === 0) return [];

        const { data, error } = await supabase
          .from(table)
          .select("*")
          .in(column, values);

        return error ? [] : (data ?? []);
      }

      const [letters, surprises] = await Promise.all([
        supabase.rpc("my_letters"),
        supabase.rpc("my_surprises", { p_tz: myTimeZone() }),
      ]);

      const copy = {
        exported_at: new Date().toISOString(),
        profile: (await rows("profiles", "id", [user.id]))[0] ?? null,
        relationships,
        checkins: await rows("checkins", "user_id", [user.id]),
        visits: await rows("visits", "relationship_id", ids),
        dates: await rows("dates", "relationship_id", ids),
        memories: await rows("memories", "relationship_id", ids),
        countdowns: await rows("countdowns", "relationship_id", ids),
        saved_date_ideas: await rows("couple_date_ideas", "relationship_id", ids),
        photos_of_the_day: await rows("daily_photos", "relationship_id", ids),
        letters: letters.error ? [] : (letters.data ?? []),
        surprises: surprises.error ? [] : (surprises.data ?? []),
      };

      const blob = new Blob([JSON.stringify(copy, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `far-but-together-${format(new Date(), "yyyy-MM-dd")}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setMessage("Downloaded. Photos aren't included, only their details.");
    } catch {
      setMessage("Couldn't prepare your download. Try again in a moment.");
    }

    setBusy(false);
  }

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="font-display text-2xl text-ink">Download your data</h2>
      <p className="mt-2 text-ink/75">
        Get a copy of your check-ins, dates, memories, letters and more as one
        file.
      </p>

      <button
        type="button"
        onClick={download}
        disabled={busy}
        className={`${SECONDARY_BUTTON} mt-4`}
      >
        {busy ? "Preparing..." : "Download my data"}
      </button>

      {message ? (
        <p role="status" className="mt-3 text-sm font-semibold text-ink">
          {message}
        </p>
      ) : null}
    </section>
  );
}

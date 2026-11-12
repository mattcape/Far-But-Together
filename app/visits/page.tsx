"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import StatusMessage from "@/components/StatusMessage";
import { CARD, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

export default function VisitsPage() {
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  function fail(text: string) {
    setFailed(true);
    setMessage(text);
  }

  async function saveVisit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!date) {
      fail("Pick a date first.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setBusy(true);

    const { data: relationships } = await supabase
      .from("relationships")
      .select("*");

    const relationship = relationships?.find(
      (r) => r.user_one === user.id || r.user_two === user.id
    );

    if (!relationship) {
      setBusy(false);
      fail("No relationship found. Connect with your partner first.");
      return;
    }

    const { error } = await supabase.from("visits").insert({
      relationship_id: relationship.id,
      visit_date: date,
    });

    setBusy(false);

    if (error) {
      fail(error.message);
      return;
    }

    setFailed(false);
    setMessage("Next visit saved. Your countdown is updated.");
  }

  return (
    <PageFrame
      title="Next visit"
      subtitle="Set the day you'll see each other next."
      width="max-w-xl"
    >
      <form onSubmit={saveVisit} className={`${CARD} p-6 sm:p-8`}>
        <label htmlFor="visit-date" className="mb-1 block font-semibold text-ink">
          Visit date
        </label>
        <input
          id="visit-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={INPUT}
        />

        <button
          type="submit"
          disabled={busy}
          className={`${PRIMARY_BUTTON} mt-5`}
        >
          {busy ? "Saving..." : "Save visit"}
        </button>

        <StatusMessage message={message} tone={failed ? "error" : "success"} />
      </form>
    </PageFrame>
  );
}

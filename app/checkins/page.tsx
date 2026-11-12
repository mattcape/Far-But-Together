"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import StatusMessage from "@/components/StatusMessage";
import { CARD, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

export default function CheckinsPage() {
  const [mood, setMood] = useState(5);
  const [thoughts, setThoughts] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveCheckin(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setBusy(true);

    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      mood,
      thoughts,
      gratitude,
    });

    setBusy(false);

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setFailed(false);
    setMessage("Check-in saved. Your partner can see it now.");
    setMood(5);
    setThoughts("");
    setGratitude("");
  }

  return (
    <PageFrame
      title="Daily check-in"
      subtitle="Tell your partner how today is going."
      width="max-w-2xl"
    >
      <form onSubmit={saveCheckin} className={`${CARD} p-6 sm:p-8`}>
        <label htmlFor="mood" className="mb-1 block font-semibold text-ink">
          Mood: {mood} out of 10
        </label>
        <input
          id="mood"
          type="range"
          min={1}
          max={10}
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="w-full accent-rose-deep"
        />

        <label
          htmlFor="thoughts"
          className="mb-1 mt-6 block font-semibold text-ink"
        >
          How are you feeling today?
        </label>
        <textarea
          id="thoughts"
          rows={4}
          value={thoughts}
          onChange={(e) => setThoughts(e.target.value)}
          className={INPUT}
        />

        <label
          htmlFor="gratitude"
          className="mb-1 mt-6 block font-semibold text-ink"
        >
          What are you grateful for today?
        </label>
        <textarea
          id="gratitude"
          rows={4}
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
          className={INPUT}
        />

        <button
          type="submit"
          disabled={busy}
          className={`${PRIMARY_BUTTON} mt-6`}
        >
          {busy ? "Saving..." : "Save check-in"}
        </button>

        <StatusMessage message={message} tone={failed ? "error" : "success"} />
      </form>
    </PageFrame>
  );
}

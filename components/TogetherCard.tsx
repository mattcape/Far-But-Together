"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import TogetherClock from "@/components/TogetherClock";
import { NextMilestone } from "@/components/Milestones";
import { parseVisitDate } from "@/lib/dashboardHelpers";
import { CARD, FOCUS, PRIMARY_BUTTON } from "@/lib/ui";

const link = `font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`;

// How long you've been together, with the anniversary editor. With no date
// set it turns into a highlighted prompt to add one.
export default function TogetherCard({
  relationshipId,
  anniversary,
  partnerName,
  partnerZone,
  onSaved,
}: {
  relationshipId: string | number;
  anniversary: string | null;
  partnerName: string;
  partnerZone: string | null;
  onSaved: (date: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());

  // Keep "their local time" fresh.
  useEffect(() => {
    if (!partnerZone) return;

    const id = setInterval(() => setClock(Date.now()), 30000);

    return () => clearInterval(id);
  }, [partnerZone]);

  async function save() {
    setError("");

    if (!input) return;

    const { data: saved, error: problem } = await supabase
      .from("relationships")
      .update({ anniversary: input })
      .eq("id", relationshipId)
      .select("id");

    if (problem || !saved || saved.length === 0) {
      setError(
        problem?.message ?? "That didn't save. Refresh the page and try again."
      );
      return;
    }

    onSaved(input);
    setEditing(false);
  }

  let partnerTime = "";

  if (partnerZone) {
    try {
      partnerTime = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: partnerZone,
      }).format(clock);
    } catch {
      partnerTime = "";
    }
  }

  return (
    <section
      id="together"
      className={`${CARD} p-4 sm:p-8 ${anniversary ? "" : "ring-2 ring-rose-deep/30"}`}
    >
      <h2 className="font-display text-2xl text-ink">
        {anniversary ? "Together" : "When did you two get together?"}
      </h2>
      {!anniversary ? (
        <p className="mt-1 text-ink/80">
          Add your anniversary to start counting your days together.
        </p>
      ) : null}

      {anniversary && !editing ? (
        <>
          <TogetherClock since={anniversary} />
          <p className="mt-2 text-ink/80 sm:mt-4">
            since {format(parseVisitDate(anniversary), "MMMM d, yyyy")}
          </p>
          <NextMilestone since={anniversary} />
          <button
            type="button"
            onClick={() => {
              setInput(anniversary);
              setEditing(true);
            }}
            className={`mt-1 text-sm ${link}`}
          >
            Change date
          </button>
        </>
      ) : (
        <div className="mt-3">
          <label htmlFor="anniversary" className="mb-1 block font-semibold text-ink">
            The day you got together
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="anniversary"
              type="date"
              max={format(new Date(), "yyyy-MM-dd")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3.5 py-2.5 text-ink sm:px-4 sm:py-3"
            />
            <button type="button" onClick={save} className={PRIMARY_BUTTON}>
              Save
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-rose-deep">
              {error}
            </p>
          ) : null}
        </div>
      )}

      {partnerTime ? (
        <p className="mt-2 text-ink/85 sm:mt-5">
          It&apos;s <span className="font-semibold text-ink">{partnerTime}</span>{" "}
          for {partnerName}.
        </p>
      ) : null}
    </section>
  );
}

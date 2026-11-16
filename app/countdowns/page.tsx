"use client";

import { useEffect, useState, type FormEvent } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingTable, parseDay } from "@/lib/relationship";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type Countdown = {
  id: string;
  title: string;
  target_on: string;
  created_by: string | null;
};

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

const COLUMNS = "id, title, target_on, created_by";

function daysLeft(target: string): number {
  return differenceInCalendarDays(parseDay(target), new Date());
}

function shareText(item: Countdown): string {
  const days = daysLeft(item.target_on);

  if (days === 0) return `${item.title} is today!`;
  if (days < 0) return `${item.title} was ${-days} days ago.`;
  return `${days} day${days === 1 ? "" : "s"} until ${item.title}.`;
}

export default function CountdownsPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState("");
  const [relationshipId, setRelationshipId] = useState<string | number | null>(
    null,
  );
  const [partner, setPartner] = useState({ id: "", name: "" });
  const [items, setItems] = useState<Countdown[]>([]);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const couple = await getCouple();

      if (cancelled) return;

      if (couple.status === "signed-out") {
        window.location.href = "/login";
        return;
      }

      if (couple.status === "none") {
        setView("no-relationship");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("countdowns")
        .select(COLUMNS)
        .eq("relationship_id", couple.relationshipId)
        .order("target_on", { ascending: true });

      if (cancelled) return;

      if (isMissingTable(loadError)) {
        setView("needs-setup");
        return;
      }

      setUserId(couple.userId);
      setPartner({ id: couple.partnerId, name: couple.partnerName });
      setRelationshipId(couple.relationshipId);
      setItems(data ?? []);
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !day) {
      setError("Add a name and a day.");
      return;
    }

    if (relationshipId === null) return;

    setBusy(true);

    const { data, error: insertError } = await supabase
      .from("countdowns")
      .insert({
        relationship_id: relationshipId,
        created_by: userId,
        title: title.trim(),
        target_on: day,
      })
      .select(COLUMNS)
      .single();

    setBusy(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't save that countdown.");
      return;
    }

    setItems((current) =>
      [...current, data].sort((a, b) => a.target_on.localeCompare(b.target_on)),
    );
    setTitle("");
    setDay("");
  }

  async function remove(item: Countdown) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    const { error: deleteError } = await supabase
      .from("countdowns")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((current) => current.filter((i) => i.id !== item.id));
  }

  async function copy(item: Countdown) {
    try {
      await navigator.clipboard.writeText(shareText(item));
      setNote("Copied. Paste it in a message to your partner.");
    } catch {
      setNote(shareText(item));
    }
  }

  const upcoming = items.filter((i) => daysLeft(i.target_on) >= 0);
  const past = items.filter((i) => daysLeft(i.target_on) < 0).reverse();

  return (
    <PageFrame
      title="Countdowns"
      subtitle="Count down to a trip, a birthday, or the day you finally live in the same place."
    >
      {view !== "ready" ? (
        <SharedPageState kind={view} sqlFile="weekly-features.sql" />
      ) : (
        <>
          <form onSubmit={add} className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">New countdown</h2>

            <label
              htmlFor="cd-title"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              What are you counting down to?
            </label>
            <input
              id="cd-title"
              type="text"
              maxLength={80}
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label
              htmlFor="cd-day"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Day
            </label>
            <input
              id="cd-day"
              type="date"
              className={INPUT}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />

            {error ? (
              <p
                role="alert"
                className="mt-3 text-sm font-semibold text-rose-deep"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className={`${PRIMARY_BUTTON} mt-5`}
            >
              {busy ? "Saving..." : "Add countdown"}
            </button>
          </form>

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
            Coming up
          </h2>

          {upcoming.length === 0 ? (
            <p className="text-ink/75">
              Nothing yet. Add your first countdown above.
            </p>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((item) => {
                const days = daysLeft(item.target_on);

                return (
                  <li
                    key={item.id}
                    className={`${CARD} flex items-center justify-between gap-4 p-5`}
                  >
                    <div className="min-w-0">
                      <div className="font-display text-2xl text-ink">
                        {item.title}
                      </div>
                      <div className="mt-1 text-ink/75">
                        {format(parseDay(item.target_on), "EEEE, MMMM d, yyyy")}
                      </div>
                      {item.created_by ? (
                        <div className="mt-1 text-sm text-ink/70">
                          Created by{" "}
                          {item.created_by === userId ? "you" : partner.name}
                        </div>
                      ) : null}
                      <div className="mt-3 flex gap-2 text-sm font-semibold">
                        <button
                          type="button"
                          onClick={() => copy(item)}
                          className={`rounded-full px-3 py-1 text-ink/75 hover:bg-white hover:text-ink ${FOCUS}`}
                        >
                          Copy to share
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          aria-label={`Delete ${item.title}`}
                          className={`rounded-full px-3 py-1 text-ink/75 hover:bg-white hover:text-rose-deep ${FOCUS}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="font-display text-5xl text-rose-deep">
                        {days}
                      </div>
                      <div className="text-ink/75">
                        {days === 0 ? "today" : days === 1 ? "day" : "days"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {note ? (
            <p role="status" className="mt-4 font-semibold text-ink">
              {note}
            </p>
          ) : null}

          {past.length > 0 ? (
            <>
              <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
                Past
              </h2>
              <ul className="space-y-3">
                {past.map((item) => (
                  <li
                    key={item.id}
                    className={`${CARD} flex items-center justify-between gap-4 p-4 opacity-75`}
                  >
                    <span className="text-ink">
                      {item.title},{" "}
                      {format(parseDay(item.target_on), "MMM d, yyyy")}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      aria-label={`Delete ${item.title}`}
                      className={`rounded-full px-3 py-1 text-sm font-semibold text-ink/75 hover:text-rose-deep ${FOCUS}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}

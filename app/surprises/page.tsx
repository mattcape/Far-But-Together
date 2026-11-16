"use client";

import { useEffect, useState, type FormEvent } from "react";
import { addDays, format } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingSetup, parseDay } from "@/lib/relationship";
import { myTimeZone } from "@/lib/tz";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

type Surprise = {
  id: string;
  author_id: string;
  recipient_id: string;
  title: string;
  unlock_on: string;
  opened_at: string | null;
  unlocked: boolean;
  body: string | null;
};

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

export default function SurprisesPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState("");
  const [partner, setPartner] = useState({ id: "", name: "" });
  const [relationshipId, setRelationshipId] = useState<string | number | null>(
    null,
  );
  const [items, setItems] = useState<Surprise[]>([]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  async function fetchAll(): Promise<{ rows: Surprise[]; missing: boolean }> {
    const { data, error: rpcError } = await supabase.rpc("my_surprises", {
      p_tz: myTimeZone(),
    });

    if (isMissingSetup(rpcError)) return { rows: [], missing: true };

    return { rows: (data ?? []) as Surprise[], missing: false };
  }

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

      const { rows, missing } = await fetchAll();

      if (cancelled) return;

      if (missing) {
        setView("needs-setup");
        return;
      }

      setUserId(couple.userId);
      setPartner({ id: couple.partnerId, name: couple.partnerName });
      setRelationshipId(couple.relationshipId);
      setItems(rows);
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function send(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNote("");

    if (!title.trim() || !body.trim() || !day) {
      setError("Add a title, a message and an unlock day.");
      return;
    }

    if (relationshipId === null) return;

    setBusy(true);

    const { error: insertError } = await supabase.from("surprises").insert({
      relationship_id: relationshipId,
      author_id: userId,
      recipient_id: partner.id,
      title: title.trim(),
      body: body.trim(),
      unlock_on: day,
    });

    if (insertError) {
      setBusy(false);
      setError(insertError.message);
      return;
    }

    const { rows } = await fetchAll();

    setBusy(false);
    setItems(rows);
    setTitle("");
    setBody("");
    setDay("");
    setNote(
      `Scheduled. ${partner.name} will be able to open it on ${format(
        parseDay(day),
        "MMMM d",
      )}.`,
    );
  }

  async function open(item: Surprise) {
    const { data, error: rpcError } = await supabase.rpc("open_surprise", {
      p_id: item.id,
      p_tz: myTimeZone(),
    });

    if (rpcError || !data) {
      setError("It isn't ready to open yet.");
      return;
    }

    setItems((current) =>
      current.map((s) =>
        s.id === item.id
          ? { ...s, body: data as string, opened_at: new Date().toISOString() }
          : s,
      ),
    );
  }

  async function remove(item: Surprise) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    const { error: deleteError } = await supabase
      .from("surprises")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((current) => current.filter((s) => s.id !== item.id));
  }

  const forMe = items.filter((s) => s.recipient_id === userId);
  const mine = items.filter((s) => s.author_id === userId);

  return (
    <PageFrame
      title="Surprises"
      subtitle="Write something now and choose the day it unlocks for your partner."
    >
      {view !== "ready" ? (
        <SharedPageState kind={view} sqlFile="weekly-features.sql" />
      ) : (
        <>
          <form onSubmit={send} className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">
              Schedule a surprise for {partner.name}
            </h2>

            <label
              htmlFor="s-title"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Title (they see this, but not the message)
            </label>
            <input
              id="s-title"
              type="text"
              maxLength={80}
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label
              htmlFor="s-body"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Message
            </label>
            <textarea
              id="s-body"
              rows={5}
              maxLength={2000}
              className={INPUT}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            <label
              htmlFor="s-day"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Unlocks on
            </label>
            <input
              id="s-day"
              type="date"
              min={tomorrow}
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
            {note ? (
              <p role="status" className="mt-3 text-sm font-semibold text-ink">
                {note}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className={`${PRIMARY_BUTTON} mt-5`}
            >
              {busy ? "Scheduling..." : "Schedule surprise"}
            </button>
          </form>

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">For you</h2>

          {forMe.length === 0 ? (
            <p className="text-ink/75">
              Nothing from {partner.name} yet. Maybe soon.
            </p>
          ) : (
            <ul className="space-y-4">
              {forMe.map((s) => (
                <li key={s.id} className={`${CARD} p-5`}>
                  <div className="font-display text-2xl text-ink">
                    {s.title}
                  </div>

                  {s.body ? (
                    <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink/85">
                      {s.body}
                    </p>
                  ) : s.unlocked ? (
                    <button
                      type="button"
                      onClick={() => open(s)}
                      className={`${SECONDARY_BUTTON} mt-3`}
                    >
                      Open it
                    </button>
                  ) : (
                    <p className="mt-2 text-ink/75">
                      Unlocks {format(parseDay(s.unlock_on), "EEEE, MMMM d")}.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
            Scheduled by you
          </h2>

          {mine.length === 0 ? (
            <p className="text-ink/75">
              You haven&apos;t scheduled anything yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {mine.map((s) => (
                <li
                  key={s.id}
                  className={`${CARD} flex items-start justify-between gap-4 p-5`}
                >
                  <div className="min-w-0">
                    <div className="font-display text-2xl text-ink">
                      {s.title}
                    </div>
                    <div className="mt-1 text-ink/75">
                      {s.opened_at
                        ? `${partner.name} opened it.`
                        : `Unlocks ${format(parseDay(s.unlock_on), "MMMM d, yyyy")}.`}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-ink/80">
                      {s.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    aria-label={`Delete ${s.title}`}
                    className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-ink/75 hover:bg-white hover:text-rose-deep ${FOCUS}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageFrame>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingTable, parseDay } from "@/lib/relationship";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type DateItem = {
  id: string;
  title: string;
  date_on: string;
  notes: string | null;
  created_by: string | null;
};

const COLUMNS = "id, title, date_on, notes, created_by";

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

function whenLabel(dateOn: string): string {
  const days = differenceInCalendarDays(parseDay(dateOn), new Date());

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${-days} days ago`;
}

function DateRow({
  item,
  onDelete,
  addedBy,
  muted,
}: {
  item: DateItem;
  onDelete: (item: DateItem) => void;
  addedBy: string | null;
  muted?: boolean;
}) {
  return (
    <li
      className={`${CARD} flex items-start justify-between gap-4 p-5 ${
        muted ? "opacity-75" : ""
      }`}
    >
      <div>
        <div className="font-display text-2xl text-ink">{item.title}</div>
        <div className="mt-1 text-ink/80">
          {format(parseDay(item.date_on), "EEEE, MMMM d, yyyy")}
          <span className="ml-2 font-semibold text-rose-deep">
            {whenLabel(item.date_on)}
          </span>
        </div>
        {item.notes ? (
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink/75">
            {item.notes}
          </p>
        ) : null}
        {addedBy ? (
          <p className="mt-2 text-sm text-ink/70">Created by {addedBy}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label={`Delete ${item.title}`}
        className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
      >
        Delete
      </button>
    </li>
  );
}

export default function DatesPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<
    string | number | null
  >(null);
  const [items, setItems] = useState<DateItem[]>([]);
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [dateOn, setDateOn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const mine = await getCouple();

      if (cancelled) return;

      if (mine.status === "signed-out") {
        window.location.href = "/login";
        return;
      }

      if (mine.status === "none") {
        setView("no-relationship");
        return;
      }

      const { data, error } = await supabase
        .from("dates")
        .select(COLUMNS)
        .eq("relationship_id", mine.relationshipId)
        .order("date_on", { ascending: true });

      if (cancelled) return;

      if (isMissingTable(error)) {
        setView("needs-setup");
        return;
      }

      setUserId(mine.userId);
      setPartner({ id: mine.partnerId, name: mine.partnerName });
      setRelationshipId(mine.relationshipId);
      setItems(data ?? []);
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addDate(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !dateOn) {
      setError("Add a title and a date.");
      return;
    }

    if (!userId || relationshipId === null) return;

    setBusy(true);

    const { data, error: insertError } = await supabase
      .from("dates")
      .insert({
        relationship_id: relationshipId,
        created_by: userId,
        title: title.trim(),
        date_on: dateOn,
        notes: notes.trim() || null,
      })
      .select(COLUMNS)
      .single();

    setBusy(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't save that date.");
      return;
    }

    setItems((current) =>
      [...current, data].sort((a, b) => a.date_on.localeCompare(b.date_on))
    );
    setTitle("");
    setDateOn("");
    setNotes("");
  }

  async function deleteDate(item: DateItem) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    const { error: deleteError } = await supabase
      .from("dates")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((current) => current.filter((i) => i.id !== item.id));
  }

  function addedBy(item: DateItem): string | null {
    if (!item.created_by) return null;
    if (item.created_by === userId) return "you";
    if (item.created_by === partner?.id) return partner.name;
    return null;
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = items.filter((i) => i.date_on >= today);
  const past = items.filter((i) => i.date_on < today).reverse();

  return (
    <PageFrame
      title="Dates"
      subtitle="Plan what you'll do together and see how long until each one."
    >
      {view !== "ready" ? (
        <SharedPageState kind={view} />
      ) : (
        <>
          <form onSubmit={addDate} className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Add a date</h2>

            <label
              htmlFor="date-title"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              What are you planning?
            </label>
            <input
              id="date-title"
              type="text"
              maxLength={80}
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label
              htmlFor="date-day"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Day
            </label>
            <input
              id="date-day"
              type="date"
              className={INPUT}
              value={dateOn}
              onChange={(e) => setDateOn(e.target.value)}
            />

            <label
              htmlFor="date-notes"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Notes (optional)
            </label>
            <textarea
              id="date-notes"
              rows={3}
              maxLength={500}
              className={INPUT}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {busy ? "Saving..." : "Add date"}
            </button>
          </form>

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
            Coming up
          </h2>

          {upcoming.length === 0 ? (
            <p className="text-ink/75">
              Nothing planned yet. Add your first date above.
            </p>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((item) => (
                <DateRow
                  key={item.id}
                  item={item}
                  onDelete={deleteDate}
                  addedBy={addedBy(item)}
                />
              ))}
            </ul>
          )}

          {past.length > 0 ? (
            <>
              <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
                Past
              </h2>
              <ul className="space-y-4">
                {past.map((item) => (
                  <DateRow
                    key={item.id}
                    item={item}
                    onDelete={deleteDate}
                    addedBy={addedBy(item)}
                    muted
                  />
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}

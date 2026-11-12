"use client";

import { useEffect, useState, type FormEvent } from "react";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getMyRelationship, isMissingTable } from "@/lib/relationship";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type Item = { id: string; title: string; done: boolean };

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

const COLUMNS = "id, title, done";

export default function BucketListPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | number | null>(
    null
  );
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const mine = await getMyRelationship();

      if (cancelled) return;

      if (mine.status === "signed-out") {
        window.location.href = "/login";
        return;
      }

      if (mine.status === "none") {
        setView("no-relationship");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("bucket_items")
        .select(COLUMNS)
        .eq("relationship_id", mine.relationshipId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (isMissingTable(loadError)) {
        setView("needs-setup");
        return;
      }

      setUserId(mine.userId);
      setRelationshipId(mine.relationshipId);
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

    const text = title.trim();

    if (!text) {
      setError("Write something you want to do together.");
      return;
    }

    if (!userId || relationshipId === null) return;

    setBusy(true);

    const { data, error: insertError } = await supabase
      .from("bucket_items")
      .insert({ relationship_id: relationshipId, created_by: userId, title: text })
      .select(COLUMNS)
      .single();

    setBusy(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't add that.");
      return;
    }

    setItems((current) => [...current, data]);
    setTitle("");
  }

  async function toggle(item: Item) {
    const done = !item.done;

    // Update the screen first, and put it back if saving fails.
    setItems((current) =>
      current.map((i) => (i.id === item.id ? { ...i, done } : i))
    );

    const { error: updateError } = await supabase
      .from("bucket_items")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", item.id);

    if (updateError) {
      setItems((current) =>
        current.map((i) => (i.id === item.id ? { ...i, done: item.done } : i))
      );
      setError(updateError.message);
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    const { error: deleteError } = await supabase
      .from("bucket_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((current) => current.filter((i) => i.id !== item.id));
  }

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  function Row({ item }: { item: Item }) {
    return (
      <li className={`${CARD} flex items-center justify-between gap-4 p-4`}>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => toggle(item)}
            className="h-5 w-5 accent-rose-deep"
          />
          <span
            className={`text-lg ${
              item.done ? "text-ink/60 line-through" : "text-ink"
            }`}
          >
            {item.title}
          </span>
        </label>

        <button
          type="button"
          onClick={() => remove(item)}
          aria-label={`Delete ${item.title}`}
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
        >
          Delete
        </button>
      </li>
    );
  }

  return (
    <PageFrame
      title="Bucket list"
      subtitle="Things you want to do together. Check them off as you go."
    >
      {view !== "ready" ? (
        <SharedPageState
          kind={view}
          sqlFile="batch-2.sql"
        />
      ) : (
        <>
          <form onSubmit={add} className={`${CARD} p-6`}>
            <label htmlFor="bucket-title" className="mb-1 block font-semibold text-ink">
              Add something
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="bucket-title"
                type="text"
                maxLength={120}
                className={INPUT}
                placeholder="Watch the sunrise together"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button type="submit" disabled={busy} className={`${PRIMARY_BUTTON} shrink-0`}>
                {busy ? "Adding..." : "Add"}
              </button>
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-sm font-semibold text-rose-deep">
                {error}
              </p>
            ) : null}
          </form>

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">To do</h2>
          {todo.length === 0 ? (
            <p className="text-ink/75">
              {items.length === 0
                ? "Nothing yet. Add your first idea above."
                : "Everything is checked off. Add something new!"}
            </p>
          ) : (
            <ul className="space-y-3">
              {todo.map((i) => (
                <Row key={i.id} item={i} />
              ))}
            </ul>
          )}

          {done.length > 0 ? (
            <>
              <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
                Done together
              </h2>
              <ul className="space-y-3">
                {done.map((i) => (
                  <Row key={i.id} item={i} />
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}

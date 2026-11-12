"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import {
  getMyRelationship,
  isMissingTable,
  parseDay,
} from "@/lib/relationship";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type Memory = {
  id: string;
  title: string;
  body: string | null;
  memory_date: string;
};

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

const COLUMNS = "id, title, body, memory_date";

function newestFirst(a: Memory, b: Memory): number {
  return b.memory_date.localeCompare(a.memory_date);
}

export default function MemoriesPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<
    string | number | null
  >(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [body, setBody] = useState("");
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

      const { data, error } = await supabase
        .from("memories")
        .select(COLUMNS)
        .eq("relationship_id", mine.relationshipId)
        .order("memory_date", { ascending: false });

      if (cancelled) return;

      if (isMissingTable(error)) {
        setView("needs-setup");
        return;
      }

      setUserId(mine.userId);
      setRelationshipId(mine.relationshipId);
      setMemories(data ?? []);
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addMemory(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Give this memory a title.");
      return;
    }

    if (!userId || relationshipId === null) return;

    setBusy(true);

    // Leaving the day blank means today.
    const memoryDate = day || format(new Date(), "yyyy-MM-dd");

    const { data, error: insertError } = await supabase
      .from("memories")
      .insert({
        relationship_id: relationshipId,
        created_by: userId,
        title: title.trim(),
        body: body.trim() || null,
        memory_date: memoryDate,
      })
      .select(COLUMNS)
      .single();

    setBusy(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't save that memory.");
      return;
    }

    setMemories((current) => [data, ...current].sort(newestFirst));
    setTitle("");
    setDay("");
    setBody("");
  }

  async function deleteMemory(memory: Memory) {
    if (!window.confirm(`Delete "${memory.title}"?`)) return;

    const { error: deleteError } = await supabase
      .from("memories")
      .delete()
      .eq("id", memory.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMemories((current) => current.filter((m) => m.id !== memory.id));
  }

  return (
    <PageFrame
      title="Memories"
      subtitle="Keep the moments you don't want to forget."
    >
      {view !== "ready" ? (
        <SharedPageState kind={view} />
      ) : (
        <>
          <form onSubmit={addMemory} className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Add a memory</h2>

            <label
              htmlFor="memory-title"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Title
            </label>
            <input
              id="memory-title"
              type="text"
              maxLength={80}
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label
              htmlFor="memory-day"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Day (leave blank for today)
            </label>
            <input
              id="memory-day"
              type="date"
              className={INPUT}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />

            <label
              htmlFor="memory-body"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              What happened?
            </label>
            <textarea
              id="memory-body"
              rows={4}
              maxLength={2000}
              className={INPUT}
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
              {busy ? "Saving..." : "Save memory"}
            </button>
          </form>

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
            Your memories
          </h2>

          {memories.length === 0 ? (
            <p className="text-ink/75">
              No memories yet. Save the first one above.
            </p>
          ) : (
            <ul className="space-y-4">
              {memories.map((memory) => (
                <li
                  key={memory.id}
                  className={`${CARD} flex items-start justify-between gap-4 p-5`}
                >
                  <div>
                    <div className="font-display text-2xl text-ink">
                      {memory.title}
                    </div>
                    <div className="mt-1 text-ink/70">
                      {format(parseDay(memory.memory_date), "MMMM d, yyyy")}
                    </div>
                    {memory.body ? (
                      <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink/80">
                        {memory.body}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteMemory(memory)}
                    aria-label={`Delete ${memory.title}`}
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
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

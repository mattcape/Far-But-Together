"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CARD, FOCUS } from "@/lib/ui";

type Sent = {
  id: string;
  table: "friend_requests" | "significant_other_requests";
  name: string;
};

// Requests you've sent that nobody has answered yet, each with a Cancel.
export default function SentRequests() {
  const [sent, setSent] = useState<Sent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const found: { id: string; table: Sent["table"]; to: string }[] = [];

      for (const table of ["friend_requests", "significant_other_requests"] as const) {
        const { data } = await supabase
          .from(table)
          .select("id, receiver_id")
          .eq("sender_id", user.id);

        for (const row of data ?? []) {
          found.push({ id: row.id, table, to: row.receiver_id });
        }
      }

      if (found.length === 0) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", [...new Set(found.map((f) => f.to))]);

      if (cancelled) return;

      setSent(
        found.map((f) => ({
          id: f.id,
          table: f.table,
          name: profiles?.find((p) => p.id === f.to)?.display_name || "Someone",
        }))
      );
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function cancel(item: Sent) {
    setError("");

    const { error: deleteError } = await supabase
      .from(item.table)
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSent((current) =>
      current.filter((s) => !(s.id === item.id && s.table === item.table))
    );
  }

  if (sent.length === 0 && !error) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-3xl text-ink">
        Requests you&apos;ve sent
      </h2>

      {error ? (
        <p role="alert" className="mb-3 text-sm font-semibold text-rose-deep">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {sent.map((item) => (
          <li
            key={`${item.table}-${item.id}`}
            className={`${CARD} flex items-center justify-between gap-4 p-4`}
          >
            <div>
              <div className="text-sm text-ink/70">
                {item.table === "friend_requests"
                  ? "Friend request to"
                  : "Relationship request to"}
              </div>
              <div className="font-semibold text-ink">{item.name}</div>
            </div>

            <button
              type="button"
              onClick={() => cancel(item)}
              className={`rounded-full bg-white/80 px-5 py-2 font-semibold text-ink ring-1 ring-ink/15 hover:bg-white ${FOCUS}`}
            >
              Cancel request
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

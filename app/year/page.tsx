"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingTable } from "@/lib/relationship";
import { longestStreak } from "@/lib/streaks";
import { CARD, FOCUS } from "@/lib/ui";

type Row = { user_id: string; mood: number; created_at: string };

type Review = {
  checkins: number;
  average: number | null;
  bestMonth: { name: string; average: number } | null;
  streak: number;
  memories: number | null;
  dates: number | null;
  visits: number | null;
  photos: number | null;
  partnerName: string;
};

type View = "loading" | "no-relationship" | "ready";

async function countIn(
  table: string,
  column: string,
  relationshipId: string | number,
  from: string,
  to: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("relationship_id", relationshipId)
    .gte(column, from)
    .lte(column, to);

  if (error && isMissingTable(error)) return null;

  return count ?? 0;
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
      <div className="font-display text-4xl text-rose-deep">{value}</div>
      <div className="mt-1 text-ink/80">{label}</div>
    </div>
  );
}

export default function YearPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [view, setView] = useState<View>("loading");
  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setView("loading");

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

      const from = `${year}-01-01`;
      const to = `${year}-12-31`;

      const [{ data }, memories, dates, visits, photos] = await Promise.all([
        supabase
          .from("checkins")
          .select("user_id, mood, created_at")
          .in("user_id", [couple.userId, couple.partnerId])
          .gte("created_at", new Date(year, 0, 1).toISOString())
          .lt("created_at", new Date(year + 1, 0, 1).toISOString())
          .limit(5000),
        countIn("memories", "memory_date", couple.relationshipId, from, to),
        countIn("dates", "date_on", couple.relationshipId, from, to),
        countIn("visits", "visit_date", couple.relationshipId, from, to),
        countIn("daily_photos", "photo_day", couple.relationshipId, from, to),
      ]);

      if (cancelled) return;

      const rows = (data ?? []) as Row[];
      const byMonth = new Map<number, number[]>();

      for (const r of rows) {
        const month = new Date(r.created_at).getMonth();
        byMonth.set(month, [...(byMonth.get(month) ?? []), r.mood]);
      }

      let bestMonth: Review["bestMonth"] = null;

      for (const [month, moods] of byMonth) {
        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;

        if (moods.length >= 3 && (!bestMonth || avg > bestMonth.average)) {
          bestMonth = {
            name: format(new Date(year, month, 1), "MMMM"),
            average: avg,
          };
        }
      }

      setReview({
        checkins: rows.length,
        average: rows.length
          ? rows.reduce((s, r) => s + r.mood, 0) / rows.length
          : null,
        bestMonth,
        streak: longestStreak(
          rows.map((r) => format(new Date(r.created_at), "yyyy-MM-dd")),
        ),
        memories,
        dates,
        visits,
        photos,
        partnerName: couple.partnerName,
      });
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [year]);

  const tab = (y: number) =>
    `rounded-full px-4 py-1.5 font-semibold ${FOCUS} ${
      y === year
        ? "bg-rose-deep text-white"
        : "bg-white/80 text-ink ring-1 ring-ink/15"
    }`;

  return (
    <PageFrame
      title={`${year} together`}
      subtitle="Your year with each other, in numbers."
    >
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={tab(thisYear - 1)}
          onClick={() => setYear(thisYear - 1)}
        >
          {thisYear - 1}
        </button>
        <button
          type="button"
          className={tab(thisYear)}
          onClick={() => setYear(thisYear)}
        >
          {thisYear}
        </button>
      </div>

      {view !== "ready" || !review ? (
        <SharedPageState kind={view === "ready" ? "loading" : view} />
      ) : (
        <section className={`${CARD} p-6 sm:p-8`}>
          <p className="font-display text-2xl leading-snug text-ink sm:text-3xl">
            {review.checkins === 0
              ? `No check-ins in ${year} yet. Your story starts with the next one.`
              : `You and ${review.partnerName} shared ${review.checkins} check-ins in ${year}.`}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {review.average !== null ? (
              <Tile
                value={`${review.average.toFixed(1)}/10`}
                label="Average mood between you"
              />
            ) : null}
            {review.bestMonth ? (
              <Tile
                value={review.bestMonth.name}
                label={`Your happiest month (${review.bestMonth.average.toFixed(1)}/10)`}
              />
            ) : null}
            {review.streak > 0 ? (
              <Tile
                value={`${review.streak} day${review.streak === 1 ? "" : "s"}`}
                label="Longest streak of check-ins"
              />
            ) : null}
            {review.visits !== null ? (
              <Tile
                value={String(review.visits)}
                label={
                  review.visits === 1 ? "Visit date set" : "Visit dates set"
                }
              />
            ) : null}
            {review.dates !== null ? (
              <Tile
                value={String(review.dates)}
                label={review.dates === 1 ? "Date planned" : "Dates planned"}
              />
            ) : null}
            {review.memories !== null ? (
              <Tile
                value={String(review.memories)}
                label={
                  review.memories === 1 ? "Memory saved" : "Memories saved"
                }
              />
            ) : null}
            {review.photos !== null && review.photos > 0 ? (
              <Tile
                value={String(review.photos)}
                label="Photos of the day shared"
              />
            ) : null}
          </div>
        </section>
      )}
    </PageFrame>
  );
}

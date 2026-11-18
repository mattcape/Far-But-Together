"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingTable } from "@/lib/relationship";
import { longestStreak } from "@/lib/streaks";
import { daysUntilYearReview, summarizeMoods, yearReviewOpen } from "@/lib/yearStats";
import { CARD, FOCUS } from "@/lib/ui";

type Row = { user_id: string; mood: number; created_at: string };

const PAGE = 1000;

// The database returns at most 1000 rows per request, so read in pages.
async function loadCheckins(ids: string[], year: number): Promise<Row[]> {
  const all: Row[] = [];

  for (let from = 0; from < 20000; from += PAGE) {
    const { data } = await supabase
      .from("checkins")
      .select("user_id, mood, created_at")
      .in("user_id", ids)
      .gte("created_at", new Date(year, 0, 1).toISOString())
      .lt("created_at", new Date(year + 1, 0, 1).toISOString())
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);

    const rows = (data ?? []) as Row[];

    all.push(...rows);

    if (rows.length < PAGE) break;
  }

  return all;
}

type Review = {
  checkins: number;
  average: number | null;
  mine: number | null;
  theirs: number | null;
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
  const now = new Date();
  const thisYear = now.getFullYear();
  const open = yearReviewOpen(now);
  const [year, setYear] = useState(open ? thisYear : thisYear - 1);
  const locked = year === thisYear && !open;
  const [view, setView] = useState<View>("loading");
  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (locked) return;

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

      const [rows, memories, dates, visits, photos] = await Promise.all([
        loadCheckins([couple.userId, couple.partnerId], year),
        countIn("memories", "memory_date", couple.relationshipId, from, to),
        countIn("dates", "date_on", couple.relationshipId, from, to),
        countIn("visits", "visit_date", couple.relationshipId, from, to),
        countIn("daily_photos", "photo_day", couple.relationshipId, from, to),
      ]);

      if (cancelled) return;

      const moods = summarizeMoods(rows, couple.userId);

      setReview({
        checkins: rows.length,
        average: moods.average,
        mine: moods.mine,
        theirs: moods.theirs,
        bestMonth: moods.bestMonth
          ? {
              name: format(new Date(year, moods.bestMonth.month, 1), "MMMM"),
              average: moods.bestMonth.average,
            }
          : null,
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
  }, [year, locked]);

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

      {locked ? (
        <section className={`${CARD} p-6 sm:p-8`}>
          <p className="font-display text-2xl leading-snug text-ink sm:text-3xl">
            Your {thisYear} in review opens November 1.
          </p>
          <p className="mt-3 text-ink/80">
            {(() => {
              const d = daysUntilYearReview(now);

              return `${d} day${d === 1 ? "" : "s"} to go. Keep checking in and saving memories, and it will be waiting for you.`;
            })()}
          </p>
          <button
            type="button"
            onClick={() => setYear(thisYear - 1)}
            className={`mt-5 rounded-full bg-white px-5 py-2 font-semibold text-rose-deep ring-1 ring-ink/10 hover:bg-blush ${FOCUS}`}
          >
            See {thisYear - 1} instead
          </button>
        </section>
      ) : view !== "ready" || !review ? (
        <SharedPageState kind={view === "ready" ? "loading" : view} />
      ) : (
        <section className={`${CARD} p-6 sm:p-8`}>
          <p className="font-display text-2xl leading-snug text-ink sm:text-3xl">
            {review.checkins === 0
              ? `No check-ins in ${year} yet. Your story starts with the next one.`
              : `You and ${review.partnerName === "Your partner" ? "your partner" : review.partnerName} shared ${review.checkins} check-ins in ${year}.`}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {review.average !== null ? (
              <Tile
                value={`${review.average.toFixed(1)}/10`}
                label={
                  review.mine !== null && review.theirs !== null
                    ? `Average mood between you (you ${review.mine.toFixed(1)}, ${review.partnerName} ${review.theirs.toFixed(1)})`
                    : "Average mood between you"
                }
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

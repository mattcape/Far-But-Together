"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, startOfDay, subDays } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getCouple, loadHomeData, type HomeData } from "@/lib/relationship";
import { CARD, FOCUS, PRIMARY_BUTTON } from "@/lib/ui";

type Row = {
  user_id: string;
  mood: number;
  gratitude: string | null;
  created_at: string;
};

type Person = {
  name: string;
  checkins: number;
  days: Set<string>;
  average: number | null;
  best: Row | null;
  gratitude: string | null;
};

type Recap = {
  me: Person;
  partner: Person;
  bothDays: number;
  home: HomeData;
};

type View = "loading" | "no-relationship" | "ready";

const DAYS = 7;

function summarize(name: string, rows: Row[]): Person {
  const days = new Set(
    rows.map((r) => format(new Date(r.created_at), "yyyy-MM-dd")),
  );
  const average = rows.length
    ? rows.reduce((sum, r) => sum + r.mood, 0) / rows.length
    : null;
  const best = rows.reduce<Row | null>(
    (top, r) => (!top || r.mood > top.mood ? r : top),
    null,
  );
  const latestGratitude = [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .find((r) => r.gratitude?.trim());

  return {
    name,
    checkins: rows.length,
    days,
    average,
    best,
    gratitude: latestGratitude?.gratitude?.trim() ?? null,
  };
}

function moodWord(average: number | null): string {
  if (average === null) return "No check-ins";
  if (average >= 8) return "Glowing";
  if (average >= 6) return "Doing well";
  if (average >= 4) return "Hanging in there";
  return "A rough week";
}

function Stat({ person, you }: { person: Person; you: boolean }) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 ring-1 ring-ink/10">
      <div className="font-semibold text-ink/75">
        {you ? "You" : person.name}
      </div>
      <div className="mt-1 font-display text-3xl text-rose-deep">
        {person.average === null ? "-" : `${person.average.toFixed(1)}/10`}
      </div>
      <div className="text-ink/80">{moodWord(person.average)}</div>
      <div className="mt-3 text-sm text-ink/75">
        {person.checkins === 0
          ? "No check-ins this week"
          : `${person.checkins} check-in${person.checkins === 1 ? "" : "s"} on ${
              person.days.size
            } day${person.days.size === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

function headline(recap: Recap): string {
  const { me, partner, bothDays } = recap;

  if (me.checkins === 0 && partner.checkins === 0) {
    return "A quiet week. A check-in takes a minute.";
  }
  if (bothDays >= 5)
    return `You both showed up on ${bothDays} days. That's real consistency.`;
  if (bothDays >= 1) {
    return `You both checked in on ${bothDays} day${bothDays === 1 ? "" : "s"} this week.`;
  }
  return "You each checked in, just on different days. Try the same day this week.";
}

export default function RecapPage() {
  const [view, setView] = useState<View>("loading");
  const [recap, setRecap] = useState<Recap | null>(null);

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

      const since = startOfDay(subDays(new Date(), DAYS - 1));

      const [{ data }, home] = await Promise.all([
        supabase
          .from("checkins")
          .select("user_id, mood, gratitude, created_at")
          .gte("created_at", since.toISOString())
          .in("user_id", [couple.userId, couple.partnerId]),
        loadHomeData(),
      ]);

      if (cancelled) return;

      const rows = (data ?? []) as Row[];
      const me = summarize(
        "You",
        rows.filter((r) => r.user_id === couple.userId),
      );
      const partner = summarize(
        couple.partnerName,
        rows.filter((r) => r.user_id === couple.partnerId),
      );
      const bothDays = [...me.days].filter((d) => partner.days.has(d)).length;

      setRecap({ me, partner, bothDays, home });
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const range = `${format(subDays(new Date(), DAYS - 1), "MMM d")} to ${format(
    new Date(),
    "MMM d",
  )}`;

  return (
    <PageFrame
      title="Your week"
      subtitle={`How the last seven days went for you two (${range}).`}
    >
      {view !== "ready" || !recap ? (
        <SharedPageState kind={view === "ready" ? "loading" : view} />
      ) : (
        <>
          <section className={`${CARD} p-6 sm:p-8`}>
            <p className="font-display text-2xl leading-snug text-ink sm:text-3xl">
              {headline(recap)}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Stat person={recap.me} you />
              <Stat person={recap.partner} you={false} />
            </div>

            {recap.partner.gratitude ? (
              <figure className="mt-6 rounded-2xl bg-blush/60 p-5">
                <figcaption className="font-semibold text-ink">
                  What {recap.partner.name} was grateful for
                </figcaption>
                <blockquote className="mt-1 whitespace-pre-wrap text-ink/85">
                  {recap.partner.gratitude}
                </blockquote>
              </figure>
            ) : null}
          </section>

          <section className={`${CARD} mt-6 p-6 sm:p-8`}>
            <h2 className="font-display text-2xl text-ink">Coming up</h2>
            <ul className="mt-3 space-y-2 text-lg text-ink/85">
              <li>
                {recap.home.daysToNextVisit === null ? (
                  <Link
                    href="/visits"
                    className={`font-semibold underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
                  >
                    Set your next visit date
                  </Link>
                ) : recap.home.daysToNextVisit === 0 ? (
                  "You're together today."
                ) : (
                  `Next visit in ${recap.home.daysToNextVisit} day${
                    recap.home.daysToNextVisit === 1 ? "" : "s"
                  }.`
                )}
              </li>
              <li>
                {recap.home.nextDate ? (
                  `${recap.home.nextDate.title}: ${
                    recap.home.nextDate.days === 0
                      ? "today"
                      : `in ${recap.home.nextDate.days} day${
                          recap.home.nextDate.days === 1 ? "" : "s"
                        }`
                  }.`
                ) : (
                  <Link
                    href="/dates"
                    className={`font-semibold underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
                  >
                    Plan a date
                  </Link>
                )}
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/checkins" className={PRIMARY_BUTTON}>
                Check in today
              </Link>
            </div>
          </section>
        </>
      )}
    </PageFrame>
  );
}

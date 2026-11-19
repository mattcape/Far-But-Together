"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import {
  DAYS,
  headline,
  loadRecap,
  moodWord,
  type Person,
  type Recap,
} from "@/lib/recap";
import { CARD, FOCUS, PRIMARY_BUTTON } from "@/lib/ui";

type View = "loading" | "no-relationship" | "ready";

function Stat({ person, you }: { person: Person; you: boolean }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-ink/10 sm:p-5">
      <div className="font-semibold text-ink/75">
        {you ? "You" : person.name}
      </div>
      <div className="mt-1 font-display text-2xl text-rose-deep sm:text-3xl">
        {person.average === null ? "-" : `${person.average.toFixed(1)}/10`}
      </div>
      <div className="text-ink/80">{moodWord(person.average)}</div>
      <div className="mt-2 text-xs text-ink/75 sm:mt-3 sm:text-sm">
        {person.checkins === 0
          ? "No check-ins this week"
          : `${person.checkins} check-in${person.checkins === 1 ? "" : "s"} on ${
              person.days.size
            } day${person.days.size === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

export default function RecapPage() {
  const [view, setView] = useState<View>("loading");
  const [recap, setRecap] = useState<Recap | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await loadRecap();

      if (cancelled) return;

      if (result.kind === "signed-out") {
        window.location.href = "/login";
        return;
      }

      if (result.kind === "none") {
        setView("no-relationship");
        return;
      }

      setRecap(result.recap);
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
          <section className={`${CARD} p-4 sm:p-8`}>
            <p className="font-display text-xl leading-snug text-ink sm:text-3xl">
              {headline(recap)}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-4">
              <Stat person={recap.me} you />
              <Stat person={recap.partner} you={false} />
            </div>

            {recap.partner.gratitude ? (
              <figure className="mt-3 rounded-2xl bg-blush/60 p-3 sm:mt-6 sm:p-5">
                <figcaption className="font-semibold text-ink">
                  What {recap.partner.name} was grateful for
                </figcaption>
                <blockquote className="mt-1 whitespace-pre-wrap text-ink/85">
                  {recap.partner.gratitude}
                </blockquote>
              </figure>
            ) : null}
          </section>

          <section className={`${CARD} mt-3 p-4 sm:mt-6 sm:p-8`}>
            <h2 className="font-display text-xl text-ink sm:text-2xl">Coming up</h2>
            <ul className="mt-2 space-y-1 text-base text-ink/85 sm:mt-3 sm:space-y-2 sm:text-lg">
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

            <div className="mt-4 flex flex-wrap gap-3">
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

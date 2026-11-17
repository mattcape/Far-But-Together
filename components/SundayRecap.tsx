"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { loadRecap, moodWord, type Recap, headline } from "@/lib/recap";
import { CARD, FOCUS, PRIMARY_BUTTON } from "@/lib/ui";

const KEY = "fbt-recap-dismissed";

function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// On Sundays, a short digest of the week on the dashboard. Hidden for the
// rest of the day once you dismiss it.
export default function SundayRecap() {
  const [recap, setRecap] = useState<Recap | null>(null);

  useEffect(() => {
    if (new Date().getDay() !== 0) return;

    try {
      if (localStorage.getItem(KEY) === todayKey()) return;
    } catch {
      // Storage blocked: show it; dismissing just lasts until reload.
    }

    let cancelled = false;

    loadRecap().then((result) => {
      if (!cancelled && result.kind === "ok") setRecap(result.recap);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!recap) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, todayKey());
    } catch {
      // Ignore.
    }

    setRecap(null);
  }

  const avg = (n: number | null) => (n === null ? "-" : `${n.toFixed(1)}/10`);

  return (
    <section aria-label="Your week" className={`${CARD} mb-6 p-6`}>
      <h2 className="font-display text-2xl text-ink">Your week is ready</h2>
      <p className="mt-2 text-lg leading-snug text-ink/90">{headline(recap)}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {[recap.me, recap.partner].map((p) => (
          <div key={p.name} className="rounded-2xl bg-white/70 p-3 ring-1 ring-ink/10">
            <dt className="text-sm font-semibold text-ink/75">{p.name}</dt>
            <dd className="font-display text-2xl text-rose-deep">
              {avg(p.average)}
            </dd>
            <dd className="text-sm text-ink/75">{moodWord(p.average)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/recap" className={PRIMARY_BUTTON}>
          See the full week
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className={`rounded-full px-4 py-3 font-semibold text-ink/75 hover:bg-white ${FOCUS}`}
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}

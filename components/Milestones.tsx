"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { nextMilestone, todaysMilestones } from "@/lib/milestones";
import { CARD, FOCUS } from "@/lib/ui";

const COLORS = ["#b93f61", "#f3b55c", "#8fc1e6", "#f08fae", "#ffffff"];
const PIECES = 40;

// Falling confetti. Positions come from the index so every render matches.
function Confetti() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {Array.from({ length: PIECES }, (_, i) => {
        const r = (n: number) => Math.abs(Math.sin(i * 12.9898 + n * 78.233)) % 1;

        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${r(1) * 100}%`,
              background: COLORS[i % COLORS.length],
              animationDelay: `${r(2) * 1.2}s`,
              animationDuration: `${3.2 + r(3) * 2}s`,
              width: `${7 + r(4) * 6}px`,
              height: `${10 + r(5) * 8}px`,
            }}
          />
        );
      })}
    </div>
  );
}

// Shown on the day you reach a milestone. Confetti plays once a day on each
// device (and not at all if the device asks for less motion).
export function MilestoneBanner({
  since,
  partnerName,
}: {
  since: string;
  partnerName: string;
}) {
  const labels = todaysMilestones(since);
  const key = `fbt-celebrated:${since}:${format(new Date(), "yyyy-MM-dd")}`;
  const [confetti, setConfetti] = useState(false);
  const hasMilestone = labels.length > 0;

  useEffect(() => {
    if (!hasMilestone) return;

    let seen = false;

    try {
      seen = !!localStorage.getItem(key);
      localStorage.setItem(key, "1");
    } catch {
      // Storage blocked: celebrate every time rather than never.
    }

    if (seen) return;

    const start = window.setTimeout(() => setConfetti(true), 300);
    const stop = window.setTimeout(() => setConfetti(false), 7000);

    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [hasMilestone, key]);

  if (!hasMilestone) return null;

  return (
    <>
      {confetti ? <Confetti /> : null}

      <section
        className={`${CARD} mb-6 bg-gradient-to-br from-blush to-white p-6 sm:p-8`}
      >
        <h2 className="font-display text-3xl text-rose-deep sm:text-4xl">
          Happy {labels.join(" and ")}!
        </h2>
        <p className="mt-2 text-lg leading-relaxed text-ink/85">
          Look how far you&apos;ve come. Tell {partnerName} what the best part
          has been.
        </p>
        <Link
          href="/mailbox"
          className={`mt-4 inline-block rounded-full bg-rose-deep px-6 py-3 font-semibold text-white hover:brightness-110 ${FOCUS}`}
        >
          Send {partnerName} a note
        </Link>
      </section>
    </>
  );
}

// "Next up: 1,000 days together, in 12 days."
export function NextMilestone({ since }: { since: string }) {
  const next = nextMilestone(since);

  if (!next) return null;

  return (
    <p className="mt-3 text-ink/80">
      Next milestone:{" "}
      <span className="font-semibold text-ink">{next.label}</span>, on{" "}
      {format(next.date, "MMMM d, yyyy")} (
      {next.daysAway === 1 ? "tomorrow" : `in ${next.daysAway.toLocaleString()} days`}
      ).
    </p>
  );
}

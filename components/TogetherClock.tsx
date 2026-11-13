"use client";

import { useEffect, useState } from "react";
import { differenceInDays, differenceInMonths, intervalToDuration } from "date-fns";
import { parseDay } from "@/lib/relationship";

function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

// How long you've been together, ticking every second. The headline breaks
// it into years, months, days, hours, minutes and seconds; the totals below
// give the same time counted in a single unit.
export default function TogetherClock({
  since,
  compact = false,
}: {
  since: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(id);
  }, []);

  const start = parseDay(since);
  const end = new Date(Math.max(now, start.getTime()));
  const d = intervalToDuration({ start, end });

  const parts = [
    { n: d.years ?? 0, unit: "year" },
    { n: d.months ?? 0, unit: "month" },
    { n: d.days ?? 0, unit: "day" },
    { n: d.hours ?? 0, unit: "hour" },
    { n: d.minutes ?? 0, unit: "minute" },
    { n: d.seconds ?? 0, unit: "second" },
  ];

  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);

  // Read aloud once a minute, not every second.
  const spoken = parts
    .slice(0, 5)
    .filter((p) => p.n > 0)
    .map((p) => plural(p.n, p.unit))
    .join(", ");

  if (compact) {
    // Start from the first unit that isn't zero: "2 months, 5 days, ...".
    const first = Math.max(0, parts.findIndex((p) => p.n > 0));
    const line = parts
      .slice(first)
      .map((p) => plural(p.n, p.unit))
      .join(", ");

    return (
      <p className="mx-auto mt-2 max-w-xl text-lg text-ink/85">
        <span className="sr-only">Together for {spoken || "less than a minute"}</span>
        <span aria-hidden="true">
          Together for{" "}
          <span className="font-semibold text-ink tabular-nums">{line}</span>
        </span>
      </p>
    );
  }

  return (
    <div>
      <p className="sr-only">Together for {spoken || "less than a minute"}</p>

      <div
        aria-hidden="true"
        className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6"
      >
        {parts.map((p) => (
          <div
            key={p.unit}
            className="rounded-2xl bg-blush px-2 py-3 text-center"
          >
            <div className="font-display text-3xl tabular-nums text-rose-deep sm:text-4xl">
              {p.n}
            </div>
            <div className="text-sm text-ink/80">
              {p.n === 1 ? p.unit : `${p.unit}s`}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink/80">
        That&apos;s{" "}
        <span className="font-semibold text-ink">
          {plural(differenceInMonths(end, start), "month")}
        </span>
        ,{" "}
        <span className="font-semibold text-ink">
          {plural(differenceInDays(end, start), "day")}
        </span>
        ,{" "}
        <span className="font-semibold text-ink">
          {plural(Math.floor(seconds / 3600), "hour")}
        </span>
        ,{" "}
        <span className="font-semibold text-ink">
          {plural(Math.floor(seconds / 60), "minute")}
        </span>{" "}
        or{" "}
        <span className="font-semibold text-ink tabular-nums">
          {plural(seconds, "second")}
        </span>{" "}
        together.
      </p>
    </div>
  );
}

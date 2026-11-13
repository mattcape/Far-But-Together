import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  isSameDay,
  startOfDay,
} from "date-fns";
import { parseDay } from "@/lib/relationship";

// Days together that get a celebration, plus every half-year and anniversary.
const DAY_MARKS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000,
  3500, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
];

export type Milestone = { label: string; date: Date };

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function allMilestones(since: string): Milestone[] {
  const start = startOfDay(parseDay(since));
  const out: Milestone[] = [];

  for (const d of DAY_MARKS) {
    out.push({ label: `${d.toLocaleString()} days together`, date: addDays(start, d) });
  }

  // Every six months, for up to 30 years.
  for (let months = 6; months <= 360; months += 6) {
    out.push({
      label:
        months % 12 === 0
          ? `${ordinal(months / 12)} anniversary`
          : `${months} months together`,
      date: addMonths(start, months),
    });
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Milestones that fall on today. Usually none, sometimes one or two.
export function todaysMilestones(since: string, now = new Date()): string[] {
  return allMilestones(since)
    .filter((m) => isSameDay(m.date, now))
    .map((m) => m.label);
}

// The next milestone after today.
export function nextMilestone(
  since: string,
  now = new Date()
): { label: string; date: Date; daysAway: number } | null {
  const today = startOfDay(now);
  const next = allMilestones(since).find((m) => m.date > today);

  return next
    ? { ...next, daysAway: differenceInCalendarDays(next.date, today) }
    : null;
}

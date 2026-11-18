import { differenceInCalendarDays } from "date-fns";

// A plain "YYYY-MM-DD" is read as UTC by `new Date(...)`, which lands on the
// evening before in US timezones. Build it as local midnight instead.
export function parseVisitDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return new Date(value);
}

// Days in a row, counting back from today (or yesterday, if you haven't
// checked in yet today), with at least one check-in.
export function streakFrom(createdAt: string[]): number {
  const days = [
    ...new Set(
      createdAt.map((c) => differenceInCalendarDays(new Date(), new Date(c)))
    ),
  ].sort((a, b) => a - b);

  let expected = days[0] === 0 ? 0 : 1;
  let streak = 0;

  for (const day of days) {
    if (day !== expected) break;
    streak += 1;
    expected += 1;
  }

  return days[0] === 0 || days[0] === 1 ? streak : 0;
}

export const MOOD_DAYS = 30;

// One point per day: the average mood of that day's check-ins.
export function dailyMood(
  rows: { mood: number; created_at: string }[]
): { day: number; mood: number }[] {
  const byDay = new Map<number, number[]>();

  for (const r of rows) {
    const day = differenceInCalendarDays(new Date(), new Date(r.created_at));
    if (day < 0 || day >= MOOD_DAYS) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), r.mood]);
  }

  return [...byDay.entries()].map(([day, moods]) => ({
    day,
    mood: moods.reduce((a, b) => a + b, 0) / moods.length,
  }));
}

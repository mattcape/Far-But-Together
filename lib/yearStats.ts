import { format } from "date-fns";

export type MoodRow = { user_id: string; mood: number; created_at: string };

// The year in review opens in November, so there is a whole year to look back
// on. Last year stays available all year.
export const YEAR_REVIEW_OPENS_MONTH = 10; // November, zero-based

export function yearReviewOpen(now: Date): boolean {
  return now.getMonth() >= YEAR_REVIEW_OPENS_MONTH;
}

export function daysUntilYearReview(now: Date): number {
  const opens = new Date(now.getFullYear(), YEAR_REVIEW_OPENS_MONTH, 1);
  return Math.max(0, Math.ceil((opens.getTime() - now.getTime()) / 86400000));
}

const mean = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / values.length;

// One number per person per day: the mean of that person's check-ins that
// day. Checking in three times in a day counts once, so posting more often
// doesn't pull the average toward your mood that day.
export function dailyMoods(rows: MoodRow[]) {
  const byKey = new Map<string, { user: string; day: string; moods: number[] }>();

  for (const r of rows) {
    const day = format(new Date(r.created_at), "yyyy-MM-dd");
    const key = `${r.user_id}|${day}`;
    const entry = byKey.get(key) ?? { user: r.user_id, day, moods: [] };

    entry.moods.push(r.mood);
    byKey.set(key, entry);
  }

  return [...byKey.values()].map((e) => ({
    user: e.user,
    day: e.day,
    mood: mean(e.moods),
  }));
}

export type MoodSummary = {
  average: number | null;
  mine: number | null;
  theirs: number | null;
  bestMonth: { month: number; average: number } | null;
};

export function summarizeMoods(
  rows: MoodRow[],
  myId: string,
  minDaysForMonth = 3
): MoodSummary {
  const daily = dailyMoods(rows);
  const avg = (list: { mood: number }[]) =>
    list.length ? mean(list.map((d) => d.mood)) : null;

  const byMonth = new Map<number, { mood: number }[]>();

  for (const d of daily) {
    const month = Number(d.day.slice(5, 7)) - 1;
    byMonth.set(month, [...(byMonth.get(month) ?? []), d]);
  }

  let bestMonth: MoodSummary["bestMonth"] = null;

  for (const [month, list] of byMonth) {
    const average = mean(list.map((d) => d.mood));

    if (list.length >= minDaysForMonth && (!bestMonth || average > bestMonth.average)) {
      bestMonth = { month, average };
    }
  }

  return {
    average: avg(daily),
    mine: avg(daily.filter((d) => d.user === myId)),
    theirs: avg(daily.filter((d) => d.user !== myId)),
    bestMonth,
  };
}

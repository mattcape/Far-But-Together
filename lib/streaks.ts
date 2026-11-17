import { parseISO } from "date-fns";

// Longest run of consecutive days in a list of "YYYY-MM-DD" days.
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;

  for (const d of sorted) {
    const current = parseISO(d);

    if (
      previous &&
      Math.round((current.getTime() - previous.getTime()) / 86400000) === 1
    ) {
      run += 1;
    } else {
      run = 1;
    }

    best = Math.max(best, run);
    previous = current;
  }

  return best;
}

// The current run of consecutive days, counted back from today. A run that
// ended yesterday still counts, because today isn't over yet.
export function currentStreak(days: string[], today: Date = new Date()): number {
  const set = new Set(days);
  const pad = (n: number) => String(n).padStart(2, "0");
  const key = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!set.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);

  let run = 0;

  while (set.has(key(cursor))) {
    run += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return run;
}

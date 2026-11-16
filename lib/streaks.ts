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

import { differenceInCalendarDays, intervalToDuration } from "date-fns";

export type Stats = {
  days: number; // days since you became friends
  bestStreak: number; // most days in a row you were in touch
  messages: number; // messages sent between you
};

type Metric = keyof Stats;

export type Reward = {
  id: string;
  metric: Metric;
  threshold: number;
  title: string;
  description: string;
};

// Rewards are worked out from your history, so nothing extra is stored and
// they can't be lost.
export const REWARDS: Reward[] = [
  { id: "d7", metric: "days", threshold: 7, title: "First week", description: "Friends for 7 days" },
  { id: "d30", metric: "days", threshold: 30, title: "One month", description: "Friends for 30 days" },
  { id: "d90", metric: "days", threshold: 90, title: "Three months", description: "Friends for 90 days" },
  { id: "d180", metric: "days", threshold: 180, title: "Half a year", description: "Friends for 180 days" },
  { id: "d365", metric: "days", threshold: 365, title: "One year", description: "Friends for a whole year" },
  { id: "d730", metric: "days", threshold: 730, title: "Two years", description: "Friends for 2 years" },
  { id: "s3", metric: "bestStreak", threshold: 3, title: "Three in a row", description: "In touch 3 days in a row" },
  { id: "s7", metric: "bestStreak", threshold: 7, title: "A full week", description: "In touch 7 days in a row" },
  { id: "s14", metric: "bestStreak", threshold: 14, title: "Two weeks strong", description: "In touch 14 days in a row" },
  { id: "s30", metric: "bestStreak", threshold: 30, title: "Monthly habit", description: "In touch 30 days in a row" },
  { id: "s100", metric: "bestStreak", threshold: 100, title: "Hundred days", description: "In touch 100 days in a row" },
  { id: "m10", metric: "messages", threshold: 10, title: "Getting chatty", description: "10 messages shared" },
  { id: "m50", metric: "messages", threshold: 50, title: "Pen pals", description: "50 messages shared" },
  { id: "m100", metric: "messages", threshold: 100, title: "Long conversation", description: "100 messages shared" },
  { id: "m500", metric: "messages", threshold: 500, title: "Best of friends", description: "500 messages shared" },
];

export type RewardStatus = Reward & {
  earned: boolean;
  value: number;
};

export function rewardStatuses(stats: Stats): RewardStatus[] {
  return REWARDS.map((r) => ({
    ...r,
    value: stats[r.metric],
    earned: stats[r.metric] >= r.threshold,
  }));
}

// The closest reward you haven't earned yet, by how much of it is done.
export function nextReward(stats: Stats): RewardStatus | null {
  const open = rewardStatuses(stats).filter((r) => !r.earned);

  if (open.length === 0) return null;

  return open.reduce((best, r) =>
    r.value / r.threshold > best.value / best.threshold ? r : best
  );
}

export function unitFor(metric: Metric): string {
  return metric === "messages" ? "messages" : "days";
}

export function daysSince(start: Date, now: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(now, start));
}

// "3 months, 12 days", "5 days", or "Today".
export function friendsFor(start: Date, now: Date = new Date()): string {
  if (daysSince(start, now) === 0) return "Today";

  const d = intervalToDuration({ start, end: now });
  const parts: string[] = [];

  const add = (n: number | undefined, one: string) => {
    if (n) parts.push(`${n} ${one}${n === 1 ? "" : "s"}`);
  };

  add(d.years, "year");
  add(d.months, "month");

  if ((d.years ?? 0) === 0) add(d.days, "day");

  return parts.join(", ") || `${daysSince(start, now)} days`;
}

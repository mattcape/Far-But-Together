import { describe, expect, it } from "vitest";
import {
  isMissingSetup,
  isMissingTable,
  parseDay,
} from "@/lib/relationship";
import { longestStreak } from "@/lib/streaks";
import { nextMilestone, todaysMilestones } from "@/lib/milestones";

describe("parseDay", () => {
  it("reads a plain date as local midnight, not the evening before", () => {
    const d = parseDay("2026-03-05");

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(0);
  });
});

describe("missing setup detection", () => {
  it("recognizes a missing table", () => {
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "PGRST205" })).toBe(true);
    expect(isMissingTable({ message: "relation does not exist" })).toBe(true);
  });

  it("recognizes a missing function", () => {
    expect(isMissingSetup({ code: "PGRST202" })).toBe(true);
    expect(
      isMissingSetup({ message: "Could not find the function public.x" })
    ).toBe(true);
  });

  it("ignores other errors and no error", () => {
    expect(isMissingTable(null)).toBe(false);
    expect(isMissingSetup({ code: "42501", message: "denied" })).toBe(false);
  });
});

describe("longestStreak", () => {
  it("is 0 with no days", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("finds the longest run and ignores duplicates", () => {
    expect(
      longestStreak([
        "2026-01-01",
        "2026-01-02",
        "2026-01-02",
        "2026-01-03",
        "2026-01-10",
        "2026-01-11",
      ])
    ).toBe(3);
  });

  it("handles month and year boundaries", () => {
    expect(longestStreak(["2025-12-31", "2026-01-01", "2026-01-02"])).toBe(3);
  });
});

describe("milestones", () => {
  it("celebrates 100 days together", () => {
    const labels = todaysMilestones("2026-01-01", new Date(2026, 3, 11));

    expect(labels).toContain("100 days together");
  });

  it("finds the next milestone", () => {
    const next = nextMilestone("2026-01-01", new Date(2026, 0, 2));

    expect(next?.label).toBe("100 days together");
    expect(next?.daysAway).toBe(99);
  });
});

import { currentStreak } from "@/lib/streaks";
import { friendsFor, nextReward, rewardStatuses } from "@/lib/friendship";

describe("currentStreak", () => {
  const today = new Date(2026, 5, 10);

  it("counts back from today", () => {
    expect(currentStreak(["2026-06-10", "2026-06-09", "2026-06-08"], today)).toBe(3);
  });

  it("keeps a run that ended yesterday", () => {
    expect(currentStreak(["2026-06-09", "2026-06-08"], today)).toBe(2);
  });

  it("is 0 after a missed day", () => {
    expect(currentStreak(["2026-06-07"], today)).toBe(0);
  });
});

describe("friendship rewards", () => {
  it("earns rewards when a threshold is reached", () => {
    const earned = rewardStatuses({ days: 31, bestStreak: 3, messages: 9 })
      .filter((r) => r.earned)
      .map((r) => r.id);

    expect(earned).toEqual(["d7", "d30", "s3"]);
  });

  it("points at the closest reward not yet earned", () => {
    const next = nextReward({ days: 0, bestStreak: 0, messages: 9 });

    expect(next?.id).toBe("m10");
  });

  it("formats how long you've been friends", () => {
    const now = new Date(2026, 5, 10);

    expect(friendsFor(new Date(2026, 5, 10), now)).toBe("Today");
    expect(friendsFor(new Date(2026, 5, 5), now)).toBe("5 days");
    expect(friendsFor(new Date(2026, 2, 1), now)).toBe("3 months, 9 days");
  });
});

import { takeNewRewards } from "@/lib/friendship";

describe("takeNewRewards", () => {
  function fakeStorage() {
    const store = new Map<string, string>();

    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
  }

  it("stays quiet the first time, then reports only new rewards", () => {
    fakeStorage();

    expect(takeNewRewards("u", "f", { days: 40, bestStreak: 0, messages: 0 })).toEqual([]);

    const fresh = takeNewRewards("u", "f", { days: 95, bestStreak: 0, messages: 0 });

    expect(fresh.map((r) => r.id)).toEqual(["d90"]);
    expect(takeNewRewards("u", "f", { days: 95, bestStreak: 0, messages: 0 })).toEqual([]);
  });
});

import { streakAtRisk } from "@/lib/streaks";

describe("streakAtRisk", () => {
  const today = new Date(2026, 5, 10);

  it("flags a streak that ends today", () => {
    expect(streakAtRisk(["2026-06-09", "2026-06-08"], today)).toBe(2);
  });

  it("is quiet once you've been in touch today", () => {
    expect(streakAtRisk(["2026-06-10", "2026-06-09"], today)).toBe(0);
  });

  it("is quiet when the streak already ended", () => {
    expect(streakAtRisk(["2026-06-07", "2026-06-06"], today)).toBe(0);
  });
});


import { summarizeMoods, yearReviewOpen } from "../lib/yearStats";

describe("year in review", () => {
  it("opens in November and December only", () => {
    expect(yearReviewOpen(new Date(2026, 9, 31))).toBe(false);
    expect(yearReviewOpen(new Date(2026, 10, 1))).toBe(true);
    expect(yearReviewOpen(new Date(2026, 11, 31))).toBe(true);
    expect(yearReviewOpen(new Date(2027, 0, 1))).toBe(false);
  });

  it("counts a day once, however many check-ins were made", () => {
    const at = (d: string, h: number) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00`).toISOString();
    const rows = [
      { user_id: "me", mood: 10, created_at: at("2026-03-01", 9) },
      { user_id: "me", mood: 10, created_at: at("2026-03-01", 12) },
      { user_id: "me", mood: 10, created_at: at("2026-03-01", 18) },
      { user_id: "me", mood: 4, created_at: at("2026-03-02", 9) },
      { user_id: "them", mood: 6, created_at: at("2026-03-01", 9) },
    ];
    const s = summarizeMoods(rows, "me");

    expect(s.mine).toBe(7); // (10 + 4) / 2 days, not (10+10+10+4) / 4
    expect(s.theirs).toBe(6);
    expect(s.average).toBeCloseTo((10 + 4 + 6) / 3);
  });
});

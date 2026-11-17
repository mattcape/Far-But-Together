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

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

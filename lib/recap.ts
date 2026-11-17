import { format, startOfDay, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { getCouple, loadHomeData, type HomeData } from "@/lib/relationship";

export type Row = {
  user_id: string;
  mood: number;
  gratitude: string | null;
  created_at: string;
};

export type Person = {
  name: string;
  checkins: number;
  days: Set<string>;
  average: number | null;
  best: Row | null;
  gratitude: string | null;
};

export type Recap = {
  me: Person;
  partner: Person;
  bothDays: number;
  home: HomeData;
};

export const DAYS = 7;

export function summarize(name: string, rows: Row[]): Person {
  const days = new Set(
    rows.map((r) => format(new Date(r.created_at), "yyyy-MM-dd")),
  );
  const average = rows.length
    ? rows.reduce((sum, r) => sum + r.mood, 0) / rows.length
    : null;
  const best = rows.reduce<Row | null>(
    (top, r) => (!top || r.mood > top.mood ? r : top),
    null,
  );
  const latestGratitude = [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .find((r) => r.gratitude?.trim());

  return {
    name,
    checkins: rows.length,
    days,
    average,
    best,
    gratitude: latestGratitude?.gratitude?.trim() ?? null,
  };
}

export function moodWord(average: number | null): string {
  if (average === null) return "No check-ins";
  if (average >= 8) return "Glowing";
  if (average >= 6) return "Doing well";
  if (average >= 4) return "Hanging in there";
  return "A rough week";
}

export function headline(recap: Recap): string {
  const { me, partner, bothDays } = recap;

  if (me.checkins === 0 && partner.checkins === 0) {
    return "A quiet week. A check-in takes a minute.";
  }
  if (bothDays >= 5)
    return `You both showed up on ${bothDays} days. That's real consistency.`;
  if (bothDays >= 1) {
    return `You both checked in on ${bothDays} day${bothDays === 1 ? "" : "s"} this week.`;
  }
  return "You each checked in, just on different days. Try the same day this week.";
}

export type RecapResult =
  | { kind: "signed-out" }
  | { kind: "none" }
  | { kind: "ok"; recap: Recap };

// The last seven days for you and your partner.
export async function loadRecap(): Promise<RecapResult> {
  const couple = await getCouple();

  if (couple.status === "signed-out") return { kind: "signed-out" };
  if (couple.status === "none") return { kind: "none" };

  const since = startOfDay(subDays(new Date(), DAYS - 1));

  const [{ data }, home] = await Promise.all([
    supabase
      .from("checkins")
      .select("user_id, mood, gratitude, created_at")
      .gte("created_at", since.toISOString())
      .in("user_id", [couple.userId, couple.partnerId]),
    loadHomeData(),
  ]);

  const rows = (data ?? []) as Row[];
  const me = summarize(
    "You",
    rows.filter((r) => r.user_id === couple.userId)
  );
  const partner = summarize(
    couple.partnerName,
    rows.filter((r) => r.user_id === couple.partnerId)
  );
  const bothDays = [...me.days].filter((d) => partner.days.has(d)).length;

  return { kind: "ok", recap: { me, partner, bothDays, home } };
}

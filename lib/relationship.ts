import { differenceInCalendarDays, format } from "date-fns";
import { supabase } from "@/lib/supabase";

export type HomeData = {
  signedIn: boolean;
  name: string | null;
  partnerName: string | null;
  daysToNextVisit: number | null;
  nextDate: { title: string; days: number } | null;
  anniversary: string | null;
};

const SIGNED_OUT: HomeData = {
  signedIn: false,
  name: null,
  partnerName: null,
  daysToNextVisit: null,
  nextDate: null,
  anniversary: null,
};

// A plain "YYYY-MM-DD" is read as UTC by `new Date(...)`, which lands on the
// evening before in US timezones. Build it as local midnight instead.
export function parseDay(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  return new Date(value);
}

// Everything the homepage needs in one call: who is signed in, who their
// partner is, and how many days until their next visit.
export async function loadHomeData(): Promise<HomeData> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) return SIGNED_OUT;

    const result: HomeData = {
      signedIn: true,
      name: null,
      partnerName: null,
      daysToNextVisit: null,
      nextDate: null,
      anniversary: null,
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    result.name = profile?.display_name || null;

    const { data: relationships } = await supabase
      .from("relationships")
      .select("id, user_one, user_two, anniversary")
      .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
      .limit(1);

    const relationship = relationships?.[0];

    if (!relationship) return result;

    result.anniversary = relationship.anniversary ?? null;

    const partnerId =
      relationship.user_one === user.id
        ? relationship.user_two
        : relationship.user_one;

    const { data: partner } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", partnerId)
      .maybeSingle();

    result.partnerName = partner?.display_name || "Your partner";

    const { data: visits } = await supabase
      .from("visits")
      .select("visit_date")
      .eq("relationship_id", relationship.id)
      .gte("visit_date", format(new Date(), "yyyy-MM-dd"))
      .order("visit_date", { ascending: true })
      .limit(1);

    if (visits && visits.length > 0) {
      result.daysToNextVisit = Math.max(
        0,
        differenceInCalendarDays(
          parseDay(visits[0].visit_date),
          new Date()
        )
      );
    }

    // The next planned date. Ignored if the table isn't set up yet.
    const { data: dates } = await supabase
      .from("dates")
      .select("title, date_on")
      .eq("relationship_id", relationship.id)
      .gte("date_on", format(new Date(), "yyyy-MM-dd"))
      .order("date_on", { ascending: true })
      .limit(1);

    if (dates && dates.length > 0) {
      result.nextDate = {
        title: dates[0].title,
        days: Math.max(
          0,
          differenceInCalendarDays(parseDay(dates[0].date_on), new Date())
        ),
      };
    }

    return result;
  } catch {
    return SIGNED_OUT;
  }
}

export type MyRelationship =
  | { status: "signed-out" }
  | { status: "none"; userId: string }
  | { status: "ok"; userId: string; relationshipId: string | number };

// Finds the signed-in user's relationship, which shared pages (dates,
// memories) are scoped to.
export async function getMyRelationship(): Promise<MyRelationship> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "signed-out" };

  const { data: relationships } = await supabase
    .from("relationships")
    .select("id")
    .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
    .limit(1);

  const relationship = relationships?.[0];

  if (!relationship) return { status: "none", userId: user.id };

  return {
    status: "ok",
    userId: user.id,
    relationshipId: relationship.id,
  };
}

// True when a query failed because the table hasn't been created yet.
export function isMissingTable(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|could not find the table/i.test(error.message ?? "")
  );
}

import { differenceInCalendarDays, format } from "date-fns";
import { supabase } from "@/lib/supabase";

export type HomeData = {
  signedIn: boolean;
  name: string | null;
  partnerName: string | null;
  daysToNextVisit: number | null;
};

const SIGNED_OUT: HomeData = {
  signedIn: false,
  name: null,
  partnerName: null,
  daysToNextVisit: null,
};

// A plain "YYYY-MM-DD" is read as UTC by `new Date(...)`, which lands on the
// evening before in US timezones. Build it as local midnight instead.
function parseDay(value: string): Date {
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
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    result.name = profile?.display_name || null;

    const { data: relationships } = await supabase
      .from("relationships")
      .select("id, user_one, user_two")
      .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
      .limit(1);

    const relationship = relationships?.[0];

    if (!relationship) return result;

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

    return result;
  } catch {
    return SIGNED_OUT;
  }
}

import { differenceInCalendarDays, format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { loadNicknames, nameFor } from "@/lib/nicknames";

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

    // Your own name and your relationship don't depend on each other.
    const [{ data: profile }, { data: relationships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("relationships")
        .select("id, user_one, user_two, anniversary")
        .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
        .limit(1),
    ]);

    result.name = profile?.display_name || null;

    const relationship = relationships?.[0];

    if (!relationship) return result;

    result.anniversary = relationship.anniversary ?? null;

    const partnerId =
      relationship.user_one === user.id
        ? relationship.user_two
        : relationship.user_one;

    const today = format(new Date(), "yyyy-MM-dd");

    // The partner's name, next visit and next date are independent too.
    const [{ data: partner }, { data: visits }, { data: dates }, nicknames] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", partnerId)
          .maybeSingle(),
        supabase
          .from("visits")
          .select("visit_date")
          .eq("relationship_id", relationship.id)
          .gte("visit_date", today)
          .order("visit_date", { ascending: true })
          .limit(1),
        // Ignored if the dates table isn't set up yet.
        supabase
          .from("dates")
          .select("title, date_on")
          .eq("relationship_id", relationship.id)
          .gte("date_on", today)
          .order("date_on", { ascending: true })
          .limit(1),
        loadNicknames(),
      ]);

    result.partnerName = nameFor(
      partnerId,
      partner?.display_name || "Your partner",
      nicknames
    );

    if (visits && visits.length > 0) {
      result.daysToNextVisit = Math.max(
        0,
        differenceInCalendarDays(parseDay(visits[0].visit_date), new Date())
      );
    }

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
  const user = await getCurrentUser();

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

export type Couple =
  | { status: "signed-out" }
  | { status: "none"; userId: string }
  | {
      status: "ok";
      userId: string;
      relationshipId: string | number;
      partnerId: string;
      partnerName: string;
    };

// Like getMyRelationship, plus who your partner is.
export async function getCouple(): Promise<Couple> {
  const user = await getCurrentUser();

  if (!user) return { status: "signed-out" };

  const { data: relationships } = await supabase
    .from("relationships")
    .select("id, user_one, user_two")
    .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
    .limit(1);

  const rel = relationships?.[0];

  if (!rel) return { status: "none", userId: user.id };

  const partnerId = rel.user_one === user.id ? rel.user_two : rel.user_one;

  const [{ data: profile }, nicknames] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", partnerId)
      .maybeSingle(),
    loadNicknames(),
  ]);

  return {
    status: "ok",
    userId: user.id,
    relationshipId: rel.id,
    partnerId,
    partnerName: nameFor(
      partnerId,
      profile?.display_name || "Your partner",
      nicknames
    ),
  };
}

// True when a query failed because a table or function isn't set up yet.
export function isMissingSetup(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;

  return (
    isMissingTable(error) ||
    error.code === "PGRST202" ||
    /could not find the function/i.test(error.message ?? "")
  );
}


// Ends a relationship for both people: removes the memory photos, then the
// relationship and its shared visits. Returns an error message, or "" when
// it really worked.
export async function endRelationship(id: string | number): Promise<string> {
  const { data: photos } = await supabase
    .from("memories")
    .select("photo_path")
    .eq("relationship_id", id)
    .not("photo_path", "is", null);

  const paths = (photos ?? []).map((p) => p.photo_path as string);

  if (paths.length > 0) {
    await supabase.storage.from("memory-photos").remove(paths);
  }

  const { data: ended, error: rpcError } = await supabase.rpc(
    "end_relationship",
    { p_id: id }
  );

  if (!rpcError) {
    return ended === false
      ? "This relationship couldn't be ended. Try refreshing the page."
      : "";
  }

  // Function not set up: delete directly, but only trust a real removal.
  await supabase.from("visits").delete().eq("relationship_id", id);

  const { data: removed, error: deleteError } = await supabase
    .from("relationships")
    .delete()
    .eq("id", id)
    .select("id");

  if (deleteError) return deleteError.message;

  if (!removed || removed.length === 0) {
    return "The database didn't allow this. Run supabase/end-relationship.sql in the Supabase SQL editor, then try again.";
  }

  return "";
}

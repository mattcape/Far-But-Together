"use client";

import { useEffect, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import MoodChart, { type MoodSeries } from "@/components/MoodChart";
import WelcomeTour from "@/components/WelcomeTour";
import {
  countUnread,
  ensureTeamMessage,
  sendMessage,
} from "@/lib/messages";
import { CARD, FOCUS, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

// A plain "YYYY-MM-DD" is read as UTC by `new Date(...)`, which lands on the
// evening before in US timezones. Build it as local midnight instead.
function parseVisitDate(value: string): Date {
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

function formatCountdown(
  visitDate: Date | null,
  now: number
): string {
  if (!visitDate) return "No visit set yet";

  const diff = visitDate.getTime() - now;

  if (diff <= 0) return "It's visit day!";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diff / (1000 * 60 * 60)) % 24
  );
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days} Days ${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
}

// Days in a row, counting back from today (or yesterday, if you haven't
// checked in yet today), with at least one check-in.
function streakFrom(createdAt: string[]): number {
  const days = [
    ...new Set(
      createdAt.map((c) => differenceInCalendarDays(new Date(), new Date(c)))
    ),
  ].sort((a, b) => a - b);

  let expected = days[0] === 0 ? 0 : 1;
  let streak = 0;

  for (const day of days) {
    if (day !== expected) break;
    streak += 1;
    expected += 1;
  }

  return days[0] === 0 || days[0] === 1 ? streak : 0;
}

const MOOD_DAYS = 30;

// One point per day: the average mood of that day's check-ins.
function dailyMood(
  rows: { mood: number; created_at: string }[]
): { day: number; mood: number }[] {
  const byDay = new Map<number, number[]>();

  for (const r of rows) {
    const day = differenceInCalendarDays(new Date(), new Date(r.created_at));
    if (day < 0 || day >= MOOD_DAYS) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), r.mood]);
  }

  return [...byDay.entries()].map(([day, moods]) => ({
    day,
    mood: moods.reduce((a, b) => a + b, 0) / moods.length,
  }));
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [greeting, setGreeting] = useState("Hello");
  const [name, setName] = useState("Friend");
  const [significantOther, setSignificantOther] =
    useState("None");

  const [visitDate, setVisitDate] = useState<Date | null>(
    null
  );

  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [nudge, setNudge] = useState("");
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [moods, setMoods] = useState<{ mine: MoodSeries; theirs: MoodSeries | null } | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | number | null>(null);
  const [anniversary, setAnniversary] = useState<string | null>(null);
  const [editingAnniversary, setEditingAnniversary] = useState(false);
  const [anniversaryInput, setAnniversaryInput] = useState("");
  const [anniversaryError, setAnniversaryError] = useState("");
  const [partnerZone, setPartnerZone] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const [now, setNow] = useState(() => Date.now());

  const [latestCheckin, setLatestCheckin] =
    useState<{
      mood: number;
      thoughts: string;
      gratitude: string;
      author: string;
    } | null>(null);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Set after mount so the server and browser can't disagree on the hour.
      setGreeting(greetingFor(new Date().getHours()));

      if (!user) return;

      // A fresh team message for this visit, then how many are unread.
      ensureTeamMessage()
        .then(() => countUnread(user.id))
        .then(setUnread);

      const { data: mine } = await supabase
        .from("checkins")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(400);

      if (mine) {
        const stamps = mine.map((c) => c.created_at as string);
        setStreak(streakFrom(stamps));
        setCheckedInToday(
          stamps.some((c) => differenceInCalendarDays(new Date(), new Date(c)) === 0)
        );
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profileData?.display_name) {
        setName(profileData.display_name);
      }

      const { data: relationships } = await supabase
        .from("relationships")
        .select("*");

      if (!relationships) return;

      const relationship = relationships.find(
        (r) =>
          r.user_one === user.id ||
          r.user_two === user.id
      );

      if (!relationship) return;

      setRelationshipId(relationship.id);
      setAnniversary(relationship.anniversary ?? null);

      const otherUserId =
        relationship.user_one === user.id
          ? relationship.user_two
          : relationship.user_one;

      setPartnerId(otherUserId);

      // Time zones: remember ours if we haven't, and read our partner's.
      const { data: zones } = await supabase
        .from("profiles")
        .select("id, timezone")
        .in("id", [user.id, otherUserId]);

      const myZone = zones?.find((z) => z.id === user.id)?.timezone;
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (!myZone && detected) {
        await supabase
          .from("profiles")
          .update({ timezone: detected })
          .eq("id", user.id);
      }

      setPartnerZone(zones?.find((z) => z.id === otherUserId)?.timezone ?? null);

      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", otherUserId)
        .single();

      if (otherProfile?.display_name) {
        setSignificantOther(
          otherProfile.display_name
        );
      }

      // Only visits today or later, soonest first, so a past visit
      // never hides the next upcoming one.
      const { data: visits } = await supabase
        .from("visits")
        .select("*")
        .eq("relationship_id", relationship.id)
        .gte("visit_date", format(new Date(), "yyyy-MM-dd"))
        .order("visit_date", {
          ascending: true,
        })
        .limit(1);

      if (visits && visits.length > 0) {
        setNow(Date.now());
        setVisitDate(
          parseVisitDate(visits[0].visit_date)
        );
      }

      const since = new Date();
      since.setDate(since.getDate() - MOOD_DAYS);

      const { data: moodRows } = await supabase
        .from("checkins")
        .select("user_id, mood, created_at")
        .in("user_id", [user.id, otherUserId])
        .gte("created_at", since.toISOString());

      if (moodRows) {
        setMoods({
          mine: {
            name: "You",
            points: dailyMood(moodRows.filter((r) => r.user_id === user.id)),
          },
          theirs: {
            name: otherProfile?.display_name || "Your partner",
            points: dailyMood(moodRows.filter((r) => r.user_id === otherUserId)),
          },
        });
      }

      const { data: checkins } = await supabase
        .from("checkins")
        .select("*")
        .eq("user_id", otherUserId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (checkins && checkins.length > 0) {
        const latest = checkins[0];

        setLatestCheckin({
          author:
            otherProfile?.display_name ||
            "Your Partner",
          mood: latest.mood,
          thoughts: latest.thoughts,
          gratitude: latest.gratitude,
        });
      }
    }

    loadData();
  }, []);

  // Tick once a second while a visit is set. The cleanup stops the
  // timer when the visit changes or the page unmounts.
  useEffect(() => {
    if (!visitDate) return;

    const id = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(id);
  }, [visitDate]);

  // Keep "their local time" fresh.
  useEffect(() => {
    if (!partnerZone) return;

    const id = setInterval(() => setClock(Date.now()), 30000);

    return () => clearInterval(id);
  }, [partnerZone]);

  const countdown = formatCountdown(visitDate, now);

  async function saveAnniversary() {
    setAnniversaryError("");

    if (!anniversaryInput || relationshipId === null) return;

    const { error } = await supabase
      .from("relationships")
      .update({ anniversary: anniversaryInput })
      .eq("id", relationshipId);

    if (error) {
      setAnniversaryError(error.message);
      return;
    }

    setAnniversary(anniversaryInput);
    setEditingAnniversary(false);
  }

  const daysTogether = anniversary
    ? Math.max(0, differenceInCalendarDays(new Date(), parseVisitDate(anniversary)))
    : null;

  let partnerTime = "";

  if (partnerZone) {
    try {
      partnerTime = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: partnerZone,
      }).format(clock);
    } catch {
      partnerTime = "";
    }
  }

  async function thinkingOfYou() {
    if (!partnerId) return;

    setNudge("");
    setNudgeBusy(true);
    const problem = await sendMessage(partnerId, "nudge", "Thinking of you");
    setNudgeBusy(false);

    setNudge(
      problem ??
        `${significantOther} will see that you're thinking of them.`
    );
  }

  const link = `font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`;

  return (
    <div className="dash">
    <WelcomeTour />
    <PageFrame
      title={`${greeting}, ${name}`}
      subtitle={
        significantOther === "None"
          ? "Connect with your partner to see your countdown and their check-ins."
          : `Together with ${significantOther}`
      }
      width="max-w-4xl"
    >
      {unread !== null && unread > 0 ? (
        <Link
          href="/mailbox"
          className={`${CARD} mb-6 flex items-center justify-between gap-4 p-5 hover:bg-white ${FOCUS}`}
        >
          <span className="font-display text-xl text-ink">
            You have {unread === 1 ? "1 new message" : `${unread} new messages`}
          </span>
          <span className="font-semibold text-rose-deep">Open mailbox</span>
        </Link>
      ) : null}

      <section className={`${CARD} p-6 sm:p-8`}>
        <h2 className="font-display text-2xl text-ink">Next visit</h2>
        <p className="mt-3 font-display text-3xl leading-snug text-rose-deep sm:text-4xl">
          {countdown}
        </p>
        {!visitDate ? (
          <p className="mt-3 text-ink/80">
            <Link href="/visits" className={link}>
              Set your next visit date
            </Link>{" "}
            to start counting down.
          </p>
        ) : null}
      </section>

      {relationshipId !== null ? (
        <section className={`${CARD} mt-6 p-6 sm:p-8`}>
          <h2 className="font-display text-2xl text-ink">Together</h2>

          {daysTogether !== null && !editingAnniversary ? (
            <>
              <p className="mt-3 font-display text-3xl text-rose-deep sm:text-4xl">
                {daysTogether === 1 ? "1 day" : `${daysTogether.toLocaleString()} days`}
              </p>
              <p className="mt-2 text-ink/80">
                since {format(parseVisitDate(anniversary as string), "MMMM d, yyyy")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAnniversaryInput(anniversary ?? "");
                  setEditingAnniversary(true);
                }}
                className={`mt-2 text-sm ${link}`}
              >
                Change date
              </button>
            </>
          ) : (
            <div className="mt-3">
              <label htmlFor="anniversary" className="mb-1 block font-semibold text-ink">
                The day you got together
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="anniversary"
                  type="date"
                  max={format(new Date(), "yyyy-MM-dd")}
                  value={anniversaryInput}
                  onChange={(e) => setAnniversaryInput(e.target.value)}
                  className="w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-ink"
                />
                <button type="button" onClick={saveAnniversary} className={PRIMARY_BUTTON}>
                  Save
                </button>
              </div>
              {anniversaryError ? (
                <p role="alert" className="mt-2 text-sm font-semibold text-rose-deep">
                  {anniversaryError}
                </p>
              ) : null}
            </div>
          )}

          {partnerTime ? (
            <p className="mt-5 text-ink/85">
              It&apos;s <span className="font-semibold text-ink">{partnerTime}</span>{" "}
              for {significantOther}.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={`${CARD} mt-6 p-6 sm:p-8`}>
        <h2 className="font-display text-2xl text-ink">Your check-in streak</h2>
        <p className="mt-3 font-display text-3xl text-rose-deep sm:text-4xl">
          {streak === 1 ? "1 day" : `${streak} days`}
        </p>
        <p className="mt-2 text-ink/80">
          {checkedInToday
            ? "You've checked in today."
            : streak > 0
              ? "Check in today to keep it going."
              : "Check in today to start a streak."}
        </p>
      </section>

      <section className={`${CARD} mt-6 p-6 sm:p-8`}>
        <h2 className="font-display text-2xl text-ink">
          {significantOther === "None"
            ? "Partner's latest check-in"
            : `${significantOther}'s latest check-in`}
        </h2>

        {latestCheckin ? (
          <>
            <p className="mt-4 text-lg font-semibold text-rose-deep">
              Mood: {latestCheckin.mood}/10
            </p>

            <p className="mt-4 font-semibold text-ink">
              How are you feeling today?
            </p>
            <p className="whitespace-pre-wrap text-ink/85">
              {latestCheckin.thoughts}
            </p>

            <p className="mt-4 font-semibold text-ink">
              What are you grateful for today?
            </p>
            <p className="whitespace-pre-wrap text-ink/85">
              {latestCheckin.gratitude}
            </p>
          </>
        ) : (
          <p className="mt-3 text-ink/80">
            {significantOther === "None"
              ? "Nothing here until you're connected."
              : `${significantOther} hasn't shared a check-in yet.`}
          </p>
        )}
      </section>

      {moods &&
      moods.mine.points.length + (moods.theirs?.points.length ?? 0) >= 2 ? (
        <section className={`${CARD} mt-6 p-6 sm:p-8`}>
          <h2 className="font-display text-2xl text-ink">
            Mood, last 30 days
          </h2>
          <div className="mt-4">
            <MoodChart days={MOOD_DAYS} mine={moods.mine} theirs={moods.theirs} />
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/checkins" className={PRIMARY_BUTTON}>
          Check in today
        </Link>
        <Link href="/checkins/view" className={SECONDARY_BUTTON}>
          Check-in feed
        </Link>
        <Link href="/visits" className={SECONDARY_BUTTON}>
          Change visit date
        </Link>
        {partnerId && unread !== null ? (
          <button
            type="button"
            onClick={thinkingOfYou}
            disabled={nudgeBusy}
            className={SECONDARY_BUTTON}
          >
            {nudgeBusy ? "Sending..." : "Thinking of you"}
          </button>
        ) : null}
      </div>

      {nudge ? (
        <p role="status" className="mt-4 font-semibold text-ink">
          {nudge}
        </p>
      ) : null}
    </PageFrame>
    </div>
  );
}

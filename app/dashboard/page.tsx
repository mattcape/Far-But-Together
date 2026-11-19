"use client";

import { useEffect, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import Link from "next/link";
import {
  CalendarHeart,
  ChevronRight,
  Heart,
  PenLine,
  ScrollText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import Nudges from "@/components/Nudges";
import ScrollMemory from "@/components/ScrollMemory";
import WelcomeTour from "@/components/WelcomeTour";
import TogetherCard from "@/components/TogetherCard";
import { MilestoneBanner } from "@/components/Milestones";
import { countUnread, ensureTeamMessage, sendMessage } from "@/lib/messages";
import { CARD, FOCUS } from "@/lib/ui";
import { getCurrentUser } from "@/lib/auth";
import { loadNicknames, nameFor } from "@/lib/nicknames";
import { parseVisitDate, streakFrom } from "@/lib/dashboardHelpers";

function formatCountdown(visitDate: Date | null, now: number): string {
  if (!visitDate) return "No visit set yet";

  const diff = visitDate.getTime() - now;

  if (diff <= 0) return "It's visit day!";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days} Days ${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Today: what your partner shared, how long until you meet, and anything
// that needs you. Everything else lives behind the tabs at the bottom.
export default function Dashboard() {
  const [greeting, setGreeting] = useState("Hello");
  const [name, setName] = useState("Friend");
  const [significantOther, setSignificantOther] = useState("None");
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [nudge, setNudge] = useState("");
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [relationshipId, setRelationshipId] = useState<string | number | null>(
    null
  );
  const [anniversary, setAnniversary] = useState<string | null>(null);
  const [partnerZone, setPartnerZone] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [checkinsToday, setCheckinsToday] = useState(0);
  const checkedInToday = checkinsToday > 0;
  const [now, setNow] = useState(() => Date.now());

  const [latestCheckin, setLatestCheckin] = useState<{
    mood: number;
    thoughts: string;
    gratitude: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser();

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
        .limit(1000);

      if (mine) {
        const stamps = mine.map((c) => c.created_at as string);
        setStreak(streakFrom(stamps));
        setCheckinsToday(
          stamps.filter(
            (c) => differenceInCalendarDays(new Date(), new Date(c)) === 0
          ).length
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
        (r) => r.user_one === user.id || r.user_two === user.id
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

      const [{ data: otherRaw }, nicknames] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", otherUserId)
          .single(),
        loadNicknames(),
      ]);

      // Show your nickname for them, if you gave one.
      if (otherRaw?.display_name) {
        setSignificantOther(
          nameFor(otherUserId, otherRaw.display_name, nicknames)
        );
      }

      // Only visits today or later, soonest first, so a past visit
      // never hides the next upcoming one.
      const { data: visits } = await supabase
        .from("visits")
        .select("*")
        .eq("relationship_id", relationship.id)
        .gte("visit_date", format(new Date(), "yyyy-MM-dd"))
        .order("visit_date", { ascending: true })
        .limit(1);

      if (visits && visits.length > 0) {
        setNow(Date.now());
        setVisitDate(parseVisitDate(visits[0].visit_date));
      }

      const { data: checkins } = await supabase
        .from("checkins")
        .select("*")
        .eq("user_id", otherUserId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (checkins && checkins.length > 0) {
        const latest = checkins[0];

        setLatestCheckin({
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

  async function thinkingOfYou() {
    if (!partnerId) return;

    setNudge("");
    setNudgeBusy(true);
    const problem = await sendMessage(partnerId, "nudge", "Thinking of you");
    setNudgeBusy(false);

    setNudge(
      problem ?? `${significantOther} will see that you're thinking of them.`
    );
  }

  const link = `font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`;
  const partnerLabel =
    significantOther === "None" ? "Partner" : significantOther;

  return (
    <div className="dash">
      <WelcomeTour />
      <ScrollMemory storageKey="fbt-dashboard-scroll" />
      <PageFrame
        title={`${greeting}, ${name}`}
        subtitle={
          significantOther === "None"
            ? "Connect with your partner to see your countdown and their check-ins."
            : `Together with ${significantOther}`
        }
        width="max-w-4xl"
        mobileSubtitle
      >
        <div className="flex flex-col gap-3 sm:gap-6">
          {relationshipId !== null && !anniversary ? (
            <TogetherCard
              relationshipId={relationshipId}
              anniversary={anniversary}
              partnerName={significantOther}
              partnerZone={partnerZone}
              onSaved={setAnniversary}
            />
          ) : null}

          {anniversary ? (
            <MilestoneBanner since={anniversary} partnerName={significantOther} />
          ) : null}

          <Nudges
            relationshipId={relationshipId}
            checkedInToday={checkedInToday}
            visitDate={visitDate}
            unread={unread}
          />

          <section className={`${CARD} p-4 sm:p-8`}>
            <h2 className="font-display text-xl text-ink sm:text-2xl">
              {partnerLabel}&apos;s latest check-in
            </h2>

            {latestCheckin ? (
              <>
                <p className="mt-2 font-semibold text-rose-deep">
                  Mood: {latestCheckin.mood}/10
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-ink/85">
                  {latestCheckin.thoughts}
                </p>
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-ink/75">
                  Grateful for: {latestCheckin.gratitude}
                </p>
              </>
            ) : (
              <p className="mt-2 text-ink/80">
                {significantOther === "None"
                  ? "Nothing here until you're connected."
                  : `${significantOther} hasn't shared a check-in yet.`}
              </p>
            )}
          </section>

          <section className={`${CARD} p-4 sm:p-8`}>
            <h2 className="font-display text-xl text-ink sm:text-2xl">Next visit</h2>
            <p className="mt-1 font-display text-2xl leading-snug text-rose-deep sm:text-4xl">
              {formatCountdown(visitDate, now)}
            </p>
            {!visitDate ? (
              <p className="mt-2 text-ink/80">
                <Link href="/visits" className={link}>
                  Set your next visit date
                </Link>{" "}
                to start counting down.
              </p>
            ) : null}
          </section>

          {anniversary ? (
            <Link
              href="/us"
              className={`${CARD} flex items-center justify-between gap-4 p-4 hover:bg-white ${FOCUS}`}
            >
              <span>
                <span className="block font-display text-xl text-ink">
                  {differenceInCalendarDays(
                    new Date(),
                    parseVisitDate(anniversary)
                  ).toLocaleString()}{" "}
                  days together
                </span>
                <span className="text-ink/75">
                  {streak === 1
                    ? "1-day check-in streak"
                    : `${streak}-day check-in streak`}
                </span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-deep">
                Our story
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </Link>
          ) : null}

          <section aria-label="Quick actions">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <Link
                href="/checkins"
                className={`flex flex-col items-center justify-start gap-1 rounded-2xl bg-rose-deep p-3 text-center text-xs font-semibold text-white hover:brightness-110 sm:text-sm ${FOCUS}`}
              >
                <PenLine className="h-6 w-6" aria-hidden="true" />
                {checkedInToday ? "Check in again" : "Check in"}
              </Link>
              <Link
                href="/checkins/view"
                className={`${CARD} flex flex-col items-center justify-start gap-1 p-3 text-center text-xs font-semibold text-ink hover:bg-white sm:text-sm ${FOCUS}`}
              >
                <ScrollText className="h-6 w-6 text-rose-deep" aria-hidden="true" />
                Feed
              </Link>
              <Link
                href="/visits"
                className={`${CARD} flex flex-col items-center justify-start gap-1 p-3 text-center text-xs font-semibold text-ink hover:bg-white sm:text-sm ${FOCUS}`}
              >
                <CalendarHeart className="h-6 w-6 text-rose-deep" aria-hidden="true" />
                Visit date
              </Link>
              {partnerId ? (
                <button
                  type="button"
                  onClick={thinkingOfYou}
                  disabled={nudgeBusy}
                  className={`${CARD} flex flex-col items-center justify-start gap-1 p-3 text-center text-xs font-semibold text-ink hover:bg-white disabled:opacity-60 sm:text-sm ${FOCUS}`}
                >
                  <Heart className="h-6 w-6 text-rose-deep" aria-hidden="true" />
                  {nudgeBusy ? "Sending..." : "Thinking of you"}
                </button>
              ) : null}
            </div>

            {nudge ? (
              <p role="status" className="mt-3 font-semibold text-ink">
                {nudge}
              </p>
            ) : null}
          </section>
        </div>
      </PageFrame>
    </div>
  );
}

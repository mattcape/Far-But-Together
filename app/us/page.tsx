"use client";

import { useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import TogetherCard from "@/components/TogetherCard";
import MoodChart, { type MoodSeries } from "@/components/MoodChart";
import { getCouple } from "@/lib/relationship";
import { MOOD_DAYS, dailyMood, streakFrom } from "@/lib/dashboardHelpers";
import { CARD, FOCUS } from "@/lib/ui";

type Loaded = {
  relationshipId: string | number;
  partnerName: string;
  partnerZone: string | null;
  anniversary: string | null;
  streak: number;
  checkinsToday: number;
  moods: { mine: MoodSeries; theirs: MoodSeries } | null;
};

export default function UsPage() {
  const [state, setState] = useState<Loaded | "loading" | "none">("loading");

  useEffect(() => {
    async function load() {
      const couple = await getCouple();

      if (couple.status !== "ok") {
        setState("none");
        return;
      }

      const since = new Date();
      since.setDate(since.getDate() - MOOD_DAYS);

      const [{ data: rel }, { data: zone }, { data: mine }, { data: moodRows }] =
        await Promise.all([
          supabase
            .from("relationships")
            .select("anniversary")
            .eq("id", couple.relationshipId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("timezone")
            .eq("id", couple.partnerId)
            .maybeSingle(),
          supabase
            .from("checkins")
            .select("created_at")
            .eq("user_id", couple.userId)
            .order("created_at", { ascending: false })
            .limit(1000),
          supabase
            .from("checkins")
            .select("user_id, mood, created_at")
            .in("user_id", [couple.userId, couple.partnerId])
            .gte("created_at", since.toISOString()),
        ]);

      const stamps = (mine ?? []).map((c) => c.created_at as string);
      const rows = moodRows ?? [];

      setState({
        relationshipId: couple.relationshipId,
        partnerName: couple.partnerName,
        partnerZone: zone?.timezone ?? null,
        anniversary: rel?.anniversary ?? null,
        streak: streakFrom(stamps),
        checkinsToday: stamps.filter(
          (c) => differenceInCalendarDays(new Date(), new Date(c)) === 0
        ).length,
        moods:
          rows.length >= 2
            ? {
                mine: {
                  name: "You",
                  points: dailyMood(rows.filter((r) => r.user_id === couple.userId)),
                },
                theirs: {
                  name: couple.partnerName,
                  points: dailyMood(rows.filter((r) => r.user_id !== couple.userId)),
                },
              }
            : null,
      });
    }

    load();
  }, []);

  return (
    <PageFrame
      title="Our story"
      subtitle="How long you've been together, and how you've been doing."
      width="max-w-4xl"
    >
      {state === "loading" ? (
        <SharedPageState kind="loading" />
      ) : state === "none" ? (
        <div className={`${CARD} p-6 text-ink/80`}>
          This page opens once you and your partner are connected.{" "}
          <Link href="/friends-list" className={`font-semibold text-ink underline ${FOCUS}`}>
            Go to your friends
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <TogetherCard
            relationshipId={state.relationshipId}
            anniversary={state.anniversary}
            partnerName={state.partnerName}
            partnerZone={state.partnerZone}
            onSaved={(date) =>
              setState((s) => (typeof s === "object" ? { ...s, anniversary: date } : s))
            }
          />

          <section className={`${CARD} p-6 sm:p-8`}>
            <h2 className="font-display text-2xl text-ink">Your check-in streak</h2>
            <p className="mt-3 font-display text-3xl text-rose-deep sm:text-4xl">
              {state.streak === 1 ? "1 day" : `${state.streak} days`}
            </p>
            <p className="mt-2 text-ink/80">
              {state.checkinsToday > 0
                ? state.checkinsToday === 1
                  ? "You've checked in today."
                  : `You've checked in ${state.checkinsToday} times today.`
                : state.streak > 0
                  ? "Check in today to keep it going."
                  : "Check in today to start a streak."}
            </p>
          </section>

          {state.moods ? (
            <section className={`${CARD} p-6 sm:p-8`}>
              <h2 className="font-display text-2xl text-ink">Mood, last 30 days</h2>
              <div className="mt-4">
                <MoodChart days={MOOD_DAYS} mine={state.moods.mine} theirs={state.moods.theirs} />
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}

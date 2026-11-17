"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Award, Flame, MessagesSquare } from "lucide-react";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import StatusMessage from "@/components/StatusMessage";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { sendMessage } from "@/lib/messages";
import { NICKNAME_MAX, loadNicknames, saveNickname } from "@/lib/nicknames";
import { currentStreak, longestStreak } from "@/lib/streaks";
import {
  daysSince,
  friendsFor,
  nextReward,
  rewardStatuses,
  unitFor,
  type Stats,
} from "@/lib/friendship";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type Loaded = {
  userId: string;
  realName: string;
  since: Date | null;
  messageDays: string[];
  messages: number;
};

export default function FriendPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<"loading" | "missing" | "ready">(
    "loading"
  );
  const [data, setData] = useState<Loaded | null>(null);
  const [nickname, setNickname] = useState("");
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [nudgeNote, setNudgeNote] = useState("");
  const [nudgeFailed, setNudgeFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const [{ data: friendships }, { data: profile }, nicknames] =
        await Promise.all([
          supabase
            .from("friendships")
            .select("*")
            .or(
              `and(user_one.eq.${user.id},user_two.eq.${id}),and(user_one.eq.${id},user_two.eq.${user.id})`
            )
            .limit(1),
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", id)
            .maybeSingle(),
          loadNicknames(),
        ]);

      if (cancelled) return;

      const friendship = friendships?.[0];

      if (!friendship || !profile) {
        setState("missing");
        return;
      }

      const { data: rows } = await supabase
        .from("messages")
        .select("sender_id, created_at")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`
        )
        .limit(5000);

      if (cancelled) return;

      const messages = rows ?? [];

      setData({
        userId: user.id,
        realName: profile.display_name || "Your friend",
        since: friendship.created_at ? new Date(friendship.created_at) : null,
        messageDays: messages.map((m) => format(new Date(m.created_at), "yyyy-MM-dd")),
        messages: messages.length,
      });
      setNickname(nicknames[id] ?? "");
      setDraft(nicknames[id] ?? "");
      setState("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function sendNudge() {
    if (!data) return;

    setNudgeBusy(true);
    setNudgeNote("");

    const problem = await sendMessage(id, "nudge", "Thinking of you");

    setNudgeBusy(false);

    if (problem) {
      setNudgeFailed(true);
      setNudgeNote(problem);
      return;
    }

    // Count it right away so the streak updates without a reload.
    const today = format(new Date(), "yyyy-MM-dd");
    const days = [...data.messageDays, today];

    setData({ ...data, messageDays: days, messages: data.messages + 1 });
    setNudgeFailed(false);
    setNudgeNote(
      `Sent. Your streak is now ${currentStreak(days)} day${
        currentStreak(days) === 1 ? "" : "s"
      }.`
    );
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const error = await saveNickname(id, draft);

    if (error) {
      setFailed(true);
      setMessage(error);
      return;
    }

    setNickname(draft.trim().slice(0, NICKNAME_MAX));
    setFailed(false);
    setMessage(draft.trim() ? "Nickname saved." : "Nickname removed.");
  }

  async function removeFriend() {
    if (!data) return;

    if (
      !window.confirm(
        `Remove ${nickname || data.realName} from your friends? You can add them again later.`
      )
    )
      return;

    const { error } = await supabase
      .from("friendships")
      .delete()
      .or(
        `and(user_one.eq.${data.userId},user_two.eq.${id}),and(user_one.eq.${id},user_two.eq.${data.userId})`
      );

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    window.location.href = "/friends-list";
  }

  const stats: Stats | null = data
    ? {
        days: data.since ? daysSince(data.since) : 0,
        bestStreak: longestStreak(data.messageDays),
        messages: data.messages,
      }
    : null;

  const title = data ? nickname || data.realName : "Friend";

  return (
    <PageFrame
      title={title}
      subtitle={nickname && data ? data.realName : "Your friendship at a glance."}
    >
      {state === "loading" ? (
        <SharedPageState kind="loading" />
      ) : state === "missing" || !data || !stats ? (
        <div className={`${CARD} p-6`}>
          <h2 className="font-display text-2xl text-ink">
            You&apos;re not friends with this person
          </h2>
          <p className="mt-2 text-ink/75">
            They may have been removed.{" "}
            <Link
              href="/friends-list"
              className={`font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
            >
              Back to My friends
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Friends for</h2>
            {data.since ? (
              <>
                <p className="mt-2 font-display text-4xl text-rose-deep">
                  {friendsFor(data.since)}
                </p>
                <p className="mt-1 text-ink/75">
                  Since {format(data.since, "MMMM d, yyyy")}
                </p>
              </>
            ) : (
              <p className="mt-2 text-ink/75">
                We don&apos;t have a start date for this friendship yet.
              </p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                <Flame className="h-5 w-5 text-rose-deep" aria-hidden="true" />
                <div className="mt-2 font-display text-3xl text-ink">
                  {currentStreak(data.messageDays)}
                </div>
                <div className="text-sm text-ink/75">
                  day streak in touch
                </div>
              </div>
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                <Award className="h-5 w-5 text-rose-deep" aria-hidden="true" />
                <div className="mt-2 font-display text-3xl text-ink">
                  {stats.bestStreak}
                </div>
                <div className="text-sm text-ink/75">best streak (days)</div>
              </div>
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
                <MessagesSquare
                  className="h-5 w-5 text-rose-deep"
                  aria-hidden="true"
                />
                <div className="mt-2 font-display text-3xl text-ink">
                  {stats.messages}
                </div>
                <div className="text-sm text-ink/75">messages shared</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink/70">
              A day counts toward your streak when either of you sends the
              other a message or a nudge.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={sendNudge}
                disabled={nudgeBusy}
                className={PRIMARY_BUTTON}
              >
                {nudgeBusy ? "Sending..." : "Thinking of you"}
              </button>
              <Link
                href="/mailbox"
                className={`rounded-full bg-white/80 px-6 py-3 font-semibold text-ink ring-1 ring-ink/15 hover:bg-white ${FOCUS}`}
              >
                Write a message
              </Link>
            </div>

            <StatusMessage
              message={nudgeNote}
              tone={nudgeFailed ? "error" : "success"}
            />
          </section>

          <section className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Rewards</h2>

            {(() => {
              const next = nextReward(stats);

              return next ? (
                <p className="mt-2 text-ink/80">
                  Next up: <strong>{next.title}</strong>, {next.value} of{" "}
                  {next.threshold} {unitFor(next.metric)}.
                </p>
              ) : (
                <p className="mt-2 text-ink/80">
                  You&apos;ve earned every reward. That&apos;s a real friendship.
                </p>
              );
            })()}

            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {rewardStatuses(stats).map((r) => (
                <li
                  key={r.id}
                  className={`rounded-2xl p-4 ring-1 ${
                    r.earned
                      ? "bg-blush/70 ring-rose-deep/30"
                      : "bg-white/50 ring-ink/10"
                  }`}
                >
                  <Award
                    className={`h-6 w-6 ${
                      r.earned ? "text-rose-deep" : "text-ink/30"
                    }`}
                    aria-hidden="true"
                  />
                  <div
                    className={`mt-2 font-semibold ${
                      r.earned ? "text-ink" : "text-ink/70"
                    }`}
                  >
                    {r.title}
                  </div>
                  <div className="text-sm text-ink/70">
                    {r.earned
                      ? r.description
                      : `${Math.min(r.value, r.threshold)} of ${r.threshold} ${unitFor(r.metric)}`}
                  </div>
                  <span className="sr-only">
                    {r.earned ? "Earned" : "Not earned yet"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Nickname</h2>
            <form onSubmit={saveName} className="mt-3">
              <label
                htmlFor="nickname"
                className="mb-1 block font-semibold text-ink"
              >
                What do you call {data.realName}?
              </label>
              <input
                id="nickname"
                type="text"
                maxLength={NICKNAME_MAX}
                autoComplete="off"
                placeholder={data.realName}
                className={INPUT}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <p className="mt-1 text-sm text-ink/70">
                Only you see this. Change it as often as you like, or leave it
                empty to remove it.
              </p>

              <StatusMessage message={message} tone={failed ? "error" : "success"} />

              <button type="submit" className={`${PRIMARY_BUTTON} mt-4`}>
                Save nickname
              </button>
            </form>
          </section>

          <section className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Remove friend</h2>
            <p className="mt-2 text-ink/75">
              You can add them again later with their friend code.
            </p>
            <button
              type="button"
              onClick={removeFriend}
              className={`mt-4 rounded-full px-5 py-3 font-semibold text-rose-deep ring-1 ring-rose-deep/40 hover:bg-white ${FOCUS}`}
            >
              Remove friend
            </button>
          </section>
        </div>
      )}
    </PageFrame>
  );
}

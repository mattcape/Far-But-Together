"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { loadFriendStats, type FriendStats } from "@/lib/friendStats";
import { nextReward, rewardStatuses, unitFor } from "@/lib/friendship";
import { CARD, FOCUS } from "@/lib/ui";

export default function RewardsPage() {
  const [friends, setFriends] = useState<FriendStats[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadFriendStats().then((rows) => {
      if (!cancelled) setFriends(rows);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = (friends ?? [])
    .map((f) => ({
      f,
      earned: rewardStatuses(f.stats).filter((r) => r.earned),
      next: nextReward(f.stats),
    }))
    .sort((a, b) => b.earned.length - a.earned.length);

  const total = rows.reduce((sum, r) => sum + r.earned.length, 0);
  const link = `font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`;

  return (
    <PageFrame
      title="Friend rewards"
      subtitle="Everything you've earned with your friends, in one place."
    >
      {friends === null ? (
        <SharedPageState kind="loading" />
      ) : rows.length === 0 ? (
        <div className={`${CARD} p-6`}>
          <h2 className="font-display text-2xl text-ink">No friends yet</h2>
          <p className="mt-2 text-ink/75">
            Rewards come from time, streaks and messages with friends.{" "}
            <Link href="/friends" className={link}>
              Find friends
            </Link>
          </p>
        </div>
      ) : (
        <>
          <section className={`${CARD} p-6`}>
            <div className="font-display text-5xl text-rose-deep">{total}</div>
            <p className="mt-1 text-ink/80">
              {total === 1 ? "reward" : "rewards"} earned across{" "}
              {rows.length} {rows.length === 1 ? "friend" : "friends"}.
            </p>
          </section>

          <ul className="mt-6 space-y-4">
            {rows.map(({ f, earned, next }) => (
              <li key={f.id} className={`${CARD} p-5`}>
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/friends-list/${f.id}`}
                    className={`font-display text-2xl text-ink hover:underline ${FOCUS}`}
                  >
                    {f.name}
                  </Link>
                  <span className="shrink-0 text-ink/75">
                    {earned.length} of {rewardStatuses(f.stats).length}
                  </span>
                </div>

                {earned.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {earned.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-1.5 rounded-full bg-blush/70 px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-rose-deep/20"
                        title={r.description}
                      >
                        <Award
                          className="h-4 w-4 text-rose-deep"
                          aria-hidden="true"
                        />
                        {r.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-ink/75">Nothing earned yet.</p>
                )}

                {next ? (
                  <p className="mt-3 text-sm text-ink/75">
                    Next: <strong>{next.title}</strong>, {next.value} of{" "}
                    {next.threshold} {unitFor(next.metric)}.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </PageFrame>
  );
}

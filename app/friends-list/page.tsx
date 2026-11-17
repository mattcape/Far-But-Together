"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import SentRequests from "@/components/SentRequests";
import StatusMessage from "@/components/StatusMessage";
import { CARD, FOCUS } from "@/lib/ui";
import { getCurrentUser } from "@/lib/auth";
import { loadNicknames } from "@/lib/nicknames";

type Friend = {
  id: string;
  display_name: string;
};

export default function FriendsListPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [hasPartner, setHasPartner] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function loadFriends() {
      const user = await getCurrentUser();

      if (!user) return;

      const { data: relationships } = await supabase
        .from("relationships")
        .select("*");

      setHasPartner(
        !!relationships?.find(
          (r) => r.user_one === user.id || r.user_two === user.id
        )
      );

      const { data: friendships } = await supabase
        .from("friendships")
        .select("*");

      if (friendships) {
        const friendIds = friendships
          .filter((f) => f.user_one === user.id || f.user_two === user.id)
          .map((f) => (f.user_one === user.id ? f.user_two : f.user_one));

        const loadedFriends = await Promise.all(
          friendIds.map(async (id) => {
            const { data } = await supabase
              .from("profiles")
              .select("id, display_name")
              .eq("id", id)
              .single();

            return data;
          })
        );

        setFriends(loadedFriends.filter(Boolean) as Friend[]);
      }

      setNicknames(await loadNicknames());
      setLoaded(true);
    }

    loadFriends();
  }, []);

  async function sendRequest(friend: Friend) {
    setMessage("");

    const user = await getCurrentUser();

    if (!user) return;

    if (hasPartner) {
      setFailed(true);
      setMessage("You already have a partner.");
      return;
    }

    const { error } = await supabase
      .from("significant_other_requests")
      .insert({ sender_id: user.id, receiver_id: friend.id });

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setFailed(false);
    setMessage(
      `Relationship request sent to ${nicknames[friend.id] || friend.display_name}.`
    );
  }

  return (
    <PageFrame
      title="My friends"
      subtitle="Open a friend to see how long you've been friends, your streak and rewards."
    >
      <StatusMessage message={message} tone={failed ? "error" : "success"} />

      {!loaded ? (
        <SharedPageState kind="loading" />
      ) : friends.length === 0 ? (
        <div className={`${CARD} mt-4 p-6 text-ink/80`}>
          No friends yet. Add someone from Find friends first.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className={`${CARD} flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4`}
            >
              <Link
                href={`/friends-list/${friend.id}`}
                className={`group flex min-w-0 flex-1 basis-40 items-center justify-between gap-2 rounded-xl py-1 ${FOCUS}`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink group-hover:underline">
                    {nicknames[friend.id] || friend.display_name}
                  </span>
                  {nicknames[friend.id] ? (
                    <span className="block text-sm text-ink/70">
                      {friend.display_name}
                    </span>
                  ) : null}
                </span>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-ink/50"
                  aria-hidden="true"
                />
              </Link>

              <button
                type="button"
                disabled={hasPartner}
                onClick={() => sendRequest(friend)}
                className={`rounded-full bg-rose-deep px-5 py-2 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
              >
                {hasPartner ? "You have a partner" : "Send relationship request"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <SentRequests />
    </PageFrame>
  );
}

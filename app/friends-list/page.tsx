"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import SentRequests from "@/components/SentRequests";
import StatusMessage from "@/components/StatusMessage";
import { CARD, FOCUS } from "@/lib/ui";

type Friend = {
  id: string;
  display_name: string;
};

export default function FriendsListPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [hasPartner, setHasPartner] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function loadFriends() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      setLoaded(true);
    }

    loadFriends();
  }, []);

  async function sendRequest(friend: Friend) {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    setMessage(`Relationship request sent to ${friend.display_name}.`);
  }

  async function removeFriend(friend: Friend) {
    if (
      !window.confirm(
        `Remove ${friend.display_name} from your friends? You can add them again later.`
      )
    )
      return;

    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("friendships")
      .delete()
      .or(
        `and(user_one.eq.${user.id},user_two.eq.${friend.id}),and(user_one.eq.${friend.id},user_two.eq.${user.id})`
      );

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setFriends((current) => current.filter((f) => f.id !== friend.id));
    setFailed(false);
    setMessage(`${friend.display_name} was removed from your friends.`);
  }

  return (
    <PageFrame
      title="My friends"
      subtitle="Send a relationship request to the person you're together with."
    >
      <StatusMessage message={message} tone={failed ? "error" : "success"} />

      {!loaded ? (
        <p role="status" className="mt-4 text-ink/75">
          Loading...
        </p>
      ) : friends.length === 0 ? (
        <div className={`${CARD} mt-4 p-6 text-ink/80`}>
          No friends yet. Add someone from Find friends first.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className={`${CARD} flex items-center justify-between gap-4 p-4`}
            >
              <span className="font-semibold text-ink">
                {friend.display_name}
              </span>

              <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => removeFriend(friend)}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
              >
                Remove
              </button>
              <button
                type="button"
                disabled={hasPartner}
                onClick={() => sendRequest(friend)}
                className={`rounded-full bg-rose-deep px-5 py-2 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
              >
                {hasPartner ? "You have a partner" : "Send relationship request"}
              </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SentRequests />
    </PageFrame>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import SentRequests from "@/components/SentRequests";
import StatusMessage from "@/components/StatusMessage";
import { CARD, FOCUS, INPUT } from "@/lib/ui";
import { getCurrentUser } from "@/lib/auth";
import {
  NICKNAME_MAX,
  loadNicknames,
  saveNickname,
} from "@/lib/nicknames";

type Friend = {
  id: string;
  display_name: string;
};

export default function FriendsListPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
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
    setMessage(`Relationship request sent to ${friend.display_name}.`);
  }

  async function saveName(friend: Friend) {
    const error = await saveNickname(friend.id, draft);

    if (error) {
      setFailed(true);
      setMessage(error);
      return;
    }

    setNicknames((current) => {
      const next = { ...current };

      if (draft.trim()) next[friend.id] = draft.trim().slice(0, NICKNAME_MAX);
      else delete next[friend.id];

      return next;
    });
    setEditing(null);
    setFailed(false);
    setMessage(draft.trim() ? "Nickname saved." : "Nickname removed.");
  }

  async function removeFriend(friend: Friend) {
    if (
      !window.confirm(
        `Remove ${friend.display_name} from your friends? You can add them again later.`
      )
    )
      return;

    setMessage("");

    const user = await getCurrentUser();

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
              {editing === friend.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveName(friend);
                  }}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                >
                  <label htmlFor={`nick-${friend.id}`} className="sr-only">
                    Nickname for {friend.display_name}
                  </label>
                  <input
                    id={`nick-${friend.id}`}
                    type="text"
                    autoFocus
                    maxLength={NICKNAME_MAX}
                    placeholder={friend.display_name}
                    className={`${INPUT} min-w-0 flex-1`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button
                    type="submit"
                    className={`rounded-full bg-rose-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS}`}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold text-ink/75 hover:bg-white ${FOCUS}`}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="min-w-0 flex-1 basis-40">
                  <div className="font-semibold text-ink">
                    {nicknames[friend.id] || friend.display_name}
                  </div>
                  {nicknames[friend.id] ? (
                    <div className="text-sm text-ink/70">
                      {friend.display_name}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(nicknames[friend.id] ?? "");
                      setEditing(friend.id);
                    }}
                    className={`mt-1 whitespace-nowrap rounded-full text-sm font-semibold text-ink/75 underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`}
                  >
                    {nicknames[friend.id] ? "Change nickname" : "Add nickname"}
                  </button>
                </div>
              )}

              {editing === friend.id ? null : (
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
              )}
            </li>
          ))}
        </ul>
      )}

      <SentRequests />
    </PageFrame>
  );
}

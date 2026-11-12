"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import StatusMessage from "@/components/StatusMessage";
import { CARD, FOCUS } from "@/lib/ui";

type Profile = {
  id: string;
  display_name: string;
};

export default function FriendsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name");

      if (profileData) {
        setProfiles(profileData.filter((p) => p.id !== user.id));
      }

      const { data: friendshipData } = await supabase
        .from("friendships")
        .select("*");

      if (friendshipData) {
        setFriends(
          friendshipData
            .filter((f) => f.user_one === user.id || f.user_two === user.id)
            .map((f) => (f.user_one === user.id ? f.user_two : f.user_one))
        );
      }
    }

    loadData();
  }, []);

  async function addFriend(profile: Profile) {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("friend_requests").insert({
      sender_id: user.id,
      receiver_id: profile.id,
    });

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setFailed(false);
    setSent((current) => [...current, profile.id]);
    setMessage(`Friend request sent to ${profile.display_name}.`);
  }

  return (
    <PageFrame
      title="Find friends"
      subtitle="Send a friend request to someone you know."
    >
      <StatusMessage message={message} tone={failed ? "error" : "success"} />

      {profiles.length === 0 ? (
        <div className={`${CARD} mt-4 p-6 text-ink/80`}>
          No other people have signed up yet.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className={`${CARD} flex items-center justify-between gap-4 p-4`}
            >
              <span className="font-semibold text-ink">
                {profile.display_name}
              </span>

              {friends.includes(profile.id) ? (
                <span className="font-semibold text-ink/70">Friends</span>
              ) : sent.includes(profile.id) ? (
                <span className="font-semibold text-ink/70">Request sent</span>
              ) : (
                <button
                  type="button"
                  onClick={() => addFriend(profile)}
                  className={`rounded-full bg-rose-deep px-5 py-2 font-semibold text-white hover:brightness-110 ${FOCUS}`}
                >
                  Add friend
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  display_name: string;
};

export default function FriendsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

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
        setProfiles(
          profileData.filter(
            (profile) => profile.id !== user.id
          )
        );
      }

      const { data: friendshipData } = await supabase
        .from("friendships")
        .select("*");

      if (friendshipData) {
        const friendIds = friendshipData
          .filter(
            (f) =>
              f.user_one === user.id ||
              f.user_two === user.id
          )
          .map((f) =>
            f.user_one === user.id
              ? f.user_two
              : f.user_one
          );

        setFriends(friendIds);
      }
    }

    loadData();
  }, []);

  return (
    <main className="min-h-screen bg-pink-50 p-8">
      <h1 className="text-4xl font-bold text-pink-600 mb-6">
        Friends
      </h1>

      <div className="space-y-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="bg-white p-4 rounded-xl shadow flex justify-between items-center"
          >
            <p className="font-semibold">
              {profile.display_name}
            </p>

            {friends.includes(profile.id) ? (
              <span className="text-green-600 font-bold">
                Friends ✅
              </span>
            ) : (
              <button
                className="bg-pink-500 text-white px-4 py-2 rounded"
                onClick={async () => {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (!user) return;

                  await supabase
                    .from("friend_requests")
                    .insert({
                      sender_id: user.id,
                      receiver_id: profile.id,
                    });

                  alert("Friend request sent!");
                }}
              >
                Add Friend
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
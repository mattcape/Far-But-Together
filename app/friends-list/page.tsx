"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Friend = {
  id: string;
  display_name: string;
};

export default function FriendsListPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [hasSO, setHasSO] = useState(false);

  useEffect(() => {
    async function loadFriends() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: relationships } = await supabase
        .from("relationships")
        .select("*");

      const existingRelationship =
        relationships?.find(
          (r) =>
            r.user_one === user.id ||
            r.user_two === user.id
        );

      setHasSO(!!existingRelationship);

      const { data: friendships } = await supabase
        .from("friendships")
        .select("*");

      if (!friendships) return;

      const friendIds = friendships
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

      setFriends(
        loadedFriends.filter(Boolean) as Friend[]
      );
    }

    loadFriends();
  }, []);

  async function sendSORequest(friend: Friend) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (hasSO) {
      alert(
        "You already have a Significant Other ❤️"
      );
      return;
    }

    const { error } = await supabase
      .from("significant_other_requests")
      .insert({
        sender_id: user.id,
        receiver_id: friend.id,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      `Relationship request sent to ${friend.display_name} ❤️`
    );
  }

  return (
    <main className="min-h-screen bg-rose-50 p-8">
      <h1 className="text-4xl font-bold text-rose-800 mb-6">
        My Friends
      </h1>

      {friends.length === 0 ? (
        <div className="bg-white p-4 rounded-xl shadow">
          No friends yet.
        </div>
      ) : (
        <div className="space-y-4">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="bg-white p-4 rounded-xl shadow flex justify-between items-center"
            >
              <p className="font-semibold text-rose-800">
                {friend.display_name}
              </p>

              <button
                disabled={hasSO}
                onClick={() =>
                  sendSORequest(friend)
                }
                className={`px-4 py-2 rounded text-white ${
                  hasSO
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-500"
                }`}
              >
                {hasSO
                  ? "Already Have SO ❤️"
                  : "Send SO Request ❤️"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  display_name: string;
};

export default function FriendsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name");

        if (error) {
          console.error(error);
          setLoading(false);
          return;
        }

        const filtered =
          data?.filter((profile) => profile.id !== user.id) || [];

        setProfiles(filtered);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    }

    loadProfiles();
  }, []);

  return (
    <main className="min-h-screen bg-pink-50 p-8">
      <h1 className="text-4xl font-bold text-pink-600 mb-6">
        Friends
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : profiles.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white p-4 rounded-xl shadow flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">
                  {profile.display_name}
                </p>
              </div>

              <button
  className="bg-pink-500 text-white px-4 py-2 rounded"
  onClick={async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("friend_requests")
      .insert({
        sender_id: user.id,
        receiver_id: profile.id,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Friend request sent!");
  }}
>
  Add Friend
</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
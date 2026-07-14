"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Checkin = {
  id: string;
  mood: number;
  thoughts: string;
  gratitude: string;
  created_at: string;
};

export default function ViewCheckinsPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  useEffect(() => {
    loadCheckins();
  }, []);

  async function loadCheckins() {
    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setCheckins(data);
    }
  }

  return (
    <main className="min-h-screen bg-rose-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-rose-800 mb-6">
          Check-In Feed ❤️
        </h1>

        {checkins.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-6">
            No check-ins yet.
          </div>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin) => (
              <div
                key={checkin.id}
                className="bg-white rounded-2xl shadow p-6"
              >
                <p className="text-xl font-bold text-rose-800">
                  Mood: {checkin.mood}/10
                </p>

                <div className="mt-4">
                  <p className="font-semibold text-rose-700">
                    How are you feeling?
                  </p>

                  <p>{checkin.thoughts}</p>
                </div>

                <div className="mt-4">
                  <p className="font-semibold text-rose-700">
                    Grateful For
                  </p>

                  <p>{checkin.gratitude}</p>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  {new Date(
                    checkin.created_at
                  ).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
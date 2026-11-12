"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import { CARD } from "@/lib/ui";

type Checkin = {
  id: string;
  mood: number;
  thoughts: string;
  gratitude: string;
  created_at: string;
};

export default function ViewCheckinsPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadCheckins() {
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      if (data) setCheckins(data);
      setLoaded(true);
    }

    loadCheckins();
  }, []);

  return (
    <PageFrame
      title="Check-in feed"
      subtitle="Everything the two of you have shared, newest first."
      width="max-w-4xl"
    >
      {!loaded ? (
        <p role="status" className="text-ink/75">
          Loading...
        </p>
      ) : checkins.length === 0 ? (
        <div className={`${CARD} p-6 text-ink/80`}>
          No check-ins yet. Share your first one from Daily check-in.
        </div>
      ) : (
        <ul className="space-y-4">
          {checkins.map((checkin) => (
            <li key={checkin.id} className={`${CARD} p-6`}>
              <p className="font-display text-2xl text-ink">
                Mood: {checkin.mood}/10
              </p>

              <p className="mt-4 font-semibold text-rose-deep">
                How are you feeling?
              </p>
              <p className="whitespace-pre-wrap text-ink/85">
                {checkin.thoughts}
              </p>

              <p className="mt-4 font-semibold text-rose-deep">
                Grateful for
              </p>
              <p className="whitespace-pre-wrap text-ink/85">
                {checkin.gratitude}
              </p>

              <p className="mt-4 text-sm text-ink/65">
                {new Date(checkin.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}

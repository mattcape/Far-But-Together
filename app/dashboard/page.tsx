"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

// A plain "YYYY-MM-DD" is read as UTC by `new Date(...)`, which lands on the
// evening before in US timezones. Build it as local midnight instead.
function parseVisitDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  return new Date(value);
}

function formatCountdown(
  visitDate: Date | null,
  now: number
): string {
  if (!visitDate) return "Visit Not Set";

  const diff = visitDate.getTime() - now;

  if (diff <= 0) return "❤️ It's Visit Day! ❤️";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diff / (1000 * 60 * 60)) % 24
  );
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days} Days ${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
}

export default function Dashboard() {
  const [name, setName] = useState("Friend");
  const [significantOther, setSignificantOther] =
    useState("None");

  const [visitDate, setVisitDate] = useState<Date | null>(
    null
  );

  const [now, setNow] = useState(() => Date.now());

  const [latestCheckin, setLatestCheckin] =
    useState<{
      mood: number;
      thoughts: string;
      gratitude: string;
      author: string;
    } | null>(null);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profileData?.display_name) {
        setName(profileData.display_name);
      }

      const { data: relationships } = await supabase
        .from("relationships")
        .select("*");

      if (!relationships) return;

      const relationship = relationships.find(
        (r) =>
          r.user_one === user.id ||
          r.user_two === user.id
      );

      if (!relationship) return;

      const otherUserId =
        relationship.user_one === user.id
          ? relationship.user_two
          : relationship.user_one;

      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", otherUserId)
        .single();

      if (otherProfile?.display_name) {
        setSignificantOther(
          otherProfile.display_name
        );
      }

      // Only visits today or later, soonest first, so a past visit
      // never hides the next upcoming one.
      const { data: visits } = await supabase
        .from("visits")
        .select("*")
        .eq("relationship_id", relationship.id)
        .gte("visit_date", format(new Date(), "yyyy-MM-dd"))
        .order("visit_date", {
          ascending: true,
        })
        .limit(1);

      if (visits && visits.length > 0) {
        setNow(Date.now());
        setVisitDate(
          parseVisitDate(visits[0].visit_date)
        );
      }

      const { data: checkins } = await supabase
        .from("checkins")
        .select("*")
        .eq("user_id", otherUserId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (checkins && checkins.length > 0) {
        const latest = checkins[0];

        setLatestCheckin({
          author:
            otherProfile?.display_name ||
            "Your Partner",
          mood: latest.mood,
          thoughts: latest.thoughts,
          gratitude: latest.gratitude,
        });
      }
    }

    loadData();
  }, []);

  // Tick once a second while a visit is set. The cleanup stops the
  // timer when the visit changes or the page unmounts.
  useEffect(() => {
    if (!visitDate) return;

    const id = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(id);
  }, [visitDate]);

  const countdown = formatCountdown(visitDate, now);

  function goTo(path: string) {
    window.location.href = path;
  }

  return (
    <main className="min-h-screen bg-rose-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-rose-800">
            ❤️ Far But Together
          </h1>

          <p className="text-2xl mt-4 text-rose-800">
            Good Afternoon, {name}
          </p>

          <div className="mt-6 space-y-4">
            <p className="text-lg text-rose-800">
              ❤️ Significant Other:{" "}
              <span className="font-bold">
                {significantOther}
              </span>
            </p>

            <div className="bg-rose-100 rounded-2xl p-4">
              <p className="text-xl font-bold text-rose-800">
                ⏳ Next Visit
              </p>

              <p className="text-lg text-rose-700 mt-2">
                {countdown}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-xl font-bold text-rose-800">
                ❤️ {significantOther}'s Latest Check-In
              </p>

              {latestCheckin ? (
                <>
                  <p className="mt-4 text-lg font-semibold text-rose-700">
                    Mood: {latestCheckin.mood}/10
                  </p>

                  <div className="mt-4">
                    <p className="font-bold text-rose-800">
                      How are you feeling today?
                    </p>

                    <p className="text-rose-700 mt-1">
                      {latestCheckin.thoughts}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="font-bold text-rose-800">
                      What are you grateful for today?
                    </p>

                    <p className="text-rose-700 mt-1">
                      {latestCheckin.gratitude}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-rose-700 mt-3">
                  {significantOther} has not submitted a
                  check-in yet.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <button
            onClick={() => goTo("/friends")}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-2">👥</div>
            <h2 className="font-bold text-xl text-rose-800">
              Friends
            </h2>
          </button>

          <button
            onClick={() => goTo("/friends-list")}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-2">❤️</div>
            <h2 className="font-bold text-xl text-rose-800">
              Relationship
            </h2>
          </button>

          <button
            onClick={() =>
              goTo("/relationship-requests")
            }
            className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-2">💌</div>
            <h2 className="font-bold text-xl text-rose-800">
              Requests
            </h2>
          </button>

          <button
            onClick={() => goTo("/visits")}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-2">⏳</div>
            <h2 className="font-bold text-xl text-rose-800">
              Visits
            </h2>
          </button>

          <button
            onClick={() => goTo("/checkins")}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-2">😊</div>
            <h2 className="font-bold text-xl text-rose-800">
              Check-Ins
            </h2>
          </button>

          <button
            onClick={() => goTo("/checkins/view")}
            className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition text-left"
          >
            <div className="text-4xl mb-2">📖</div>
            <h2 className="font-bold text-xl text-rose-800">
              Check-In Feed
            </h2>
          </button>
        </div>
      </div>
    </main>
  );
}
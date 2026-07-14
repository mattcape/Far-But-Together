"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckinsPage() {
  const [mood, setMood] = useState(5);
  const [thoughts, setThoughts] = useState("");
  const [gratitude, setGratitude] = useState("");

  async function saveCheckin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("checkins")
      .insert({
        user_id: user.id,
        mood,
        thoughts,
        gratitude,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Check-in saved ❤️");

    setMood(5);
    setThoughts("");
    setGratitude("");
  }

  return (
    <main className="min-h-screen bg-rose-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow p-8">
        <h1 className="text-4xl font-bold text-rose-800 mb-6">
          Daily Check-In 😊
        </h1>

        <label className="block mb-2 font-semibold text-rose-800">
          Mood (1-10)
        </label>

        <input
          type="number"
          min="1"
          max="10"
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="w-full border rounded-lg p-3 mb-4"
        />

        <label className="block mb-2 font-semibold text-rose-800">
          How are you feeling today?
        </label>

        <textarea
          value={thoughts}
          onChange={(e) => setThoughts(e.target.value)}
          className="w-full border rounded-lg p-3 h-32 mb-4"
        />

        <label className="block mb-2 font-semibold text-rose-800">
          What are you grateful for today?
        </label>

        <textarea
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
          className="w-full border rounded-lg p-3 h-32 mb-6"
        />

        <button
          onClick={saveCheckin}
          className="bg-rose-500 text-white px-6 py-3 rounded-lg"
        >
          Save Check-In ❤️
        </button>
      </div>
    </main>
  );
}
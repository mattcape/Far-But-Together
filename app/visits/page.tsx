"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VisitsPage() {
  const [date, setDate] = useState("");

  async function saveVisit() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: relationships } = await supabase
      .from("relationships")
      .select("*");

    if (!relationships) {
      alert("No relationship found.");
      return;
    }

    const relationship = relationships.find(
      (r) =>
        r.user_one === user.id ||
        r.user_two === user.id
    );

    if (!relationship) {
      alert("No relationship found.");
      return;
    }

    const { error } = await supabase
      .from("visits")
      .insert({
        relationship_id: relationship.id,
        visit_date: date,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Next visit saved ❤️");
  }

  return (
    <main className="min-h-screen bg-rose-50 p-8">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl shadow">
        <h1 className="text-4xl font-bold text-rose-800 mb-6">
          Next Visit ❤️
        </h1>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <button
          onClick={saveVisit}
          className="bg-rose-500 text-white px-6 py-3 rounded-lg mt-4"
        >
          Save Visit
        </button>
      </div>
    </main>
  );
}
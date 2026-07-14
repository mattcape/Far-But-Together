"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("");

  async function saveProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        display_name: displayName,
      })
      .eq("id", user.id);

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow w-96">
        <h1 className="text-2xl font-bold mb-4">
          Complete Your Profile
        </h1>

        <input
          className="border p-2 w-full mb-4"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <button
          onClick={saveProfile}
          className="bg-pink-500 text-white p-2 rounded w-full"
        >
          Continue
        </button>
      </div>
    </main>
  );
}
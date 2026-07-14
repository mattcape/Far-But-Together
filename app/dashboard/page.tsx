"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [name, setName] = useState("Friend");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      if (data?.display_name) {
        setName(data.display_name);
      }
    }

    loadProfile();
  }, []);

  return (
    <main className="min-h-screen bg-pink-50 p-8">
      <h1 className="text-4xl font-bold text-pink-600">
        Good Afternoon, {name} ❤️
      </h1>

      <p className="mt-2">
        Welcome to Far But Together.
      </p>

      <div className="mt-8">
        <button
          onClick={() => {
            window.location.href = "/friends";
          }}
          className="bg-pink-500 text-white px-4 py-2 rounded"
        >
          Friends
        </button>
        <button
  onClick={() => {
    window.location.href = "/friend-requests";
  }}
  className="bg-purple-500 text-white px-4 py-2 rounded ml-4"
>
  Requests
</button>
      </div>
    </main>
  );
}
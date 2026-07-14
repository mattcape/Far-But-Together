"use client";

import { supabase } from "@/lib/supabase";

export default function Home() {
  const testConnection = async () => {
    const { data } = await supabase.auth.getSession();

    console.log(data);

    alert("Supabase connected successfully!");
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={testConnection}
        className="bg-pink-500 text-white px-6 py-3 rounded-lg"
      >
        Test Supabase Connection
      </button>
    </main>
  );
}
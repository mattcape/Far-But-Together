"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created!");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-96 bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">
          Create Account
        </h1>

        <input
          className="border p-2 w-full mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signUp}
          className="bg-pink-500 text-white px-4 py-2 rounded w-full"
        >
          Create Account
        </button>
      </div>
    </main>
  );
}
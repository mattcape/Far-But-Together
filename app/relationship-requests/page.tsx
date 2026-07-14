"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RelationshipRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
};

export default function RelationshipRequestsPage() {
  const [requests, setRequests] = useState<
    RelationshipRequest[]
  >([]);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("significant_other_requests")
      .select("*")
      .eq("receiver_id", user.id);

    if (!data) return;

    const enhanced = await Promise.all(
      data.map(async (request) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", request.sender_id)
          .single();

        return {
          ...request,
          sender_name:
            profile?.display_name || "Unknown User",
        };
      })
    );

    setRequests(enhanced);
  }

  async function acceptRequest(
    request: RelationshipRequest
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("relationships")
      .insert({
        user_one: request.sender_id,
        user_two: user.id,
      });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("significant_other_requests")
      .delete()
      .eq("id", request.id);

    setRequests(
      requests.filter((r) => r.id !== request.id)
    );

    alert("Relationship accepted ❤️");
  }

  return (
    <main className="min-h-screen bg-pink-50 p-8">
      <h1 className="text-4xl font-bold text-pink-600 mb-6">
        Relationship Requests ❤️
      </h1>

      {requests.length === 0 ? (
        <div className="bg-white p-4 rounded-xl shadow">
          No relationship requests.
        </div>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            className="bg-white p-4 rounded-xl shadow mb-4"
          >
            <p className="text-gray-500">
              Relationship Request From
            </p>

            <p className="text-xl font-bold mt-2">
              {request.sender_name}
            </p>

            <button
              onClick={() => acceptRequest(request)}
              className="bg-red-500 text-white px-4 py-2 rounded mt-4"
            >
              Accept ❤️
            </button>
          </div>
        ))
      )}
    </main>
  );
}
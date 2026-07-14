"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
};

export default function FriendRequestsPage() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    async function loadRequests() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: requestData, error } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", user.id);

      if (error) {
        console.error(error);
        return;
      }

      if (!requestData) return;

      const enhancedRequests = await Promise.all(
        requestData.map(async (request) => {
          const { data: sender } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", request.sender_id)
            .single();

          return {
            ...request,
            sender_name: sender?.display_name || "Unknown User",
          };
        })
      );

      setRequests(enhancedRequests);
    }

    loadRequests();
  }, []);

  async function acceptRequest(request: FriendRequest) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("friendships")
      .insert({
        user_one: request.sender_id,
        user_two: user.id,
      });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("friend_requests")
      .delete()
      .eq("id", request.id);

    setRequests(
      requests.filter((r) => r.id !== request.id)
    );

    alert("Friend request accepted!");
  }

  return (
    <main className="min-h-screen bg-pink-50 p-8">
      <h1 className="text-4xl font-bold text-pink-600 mb-6">
        Friend Requests
      </h1>

      {requests.length === 0 ? (
        <div className="bg-white p-4 rounded-xl shadow">
          No pending requests.
        </div>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            className="bg-white p-4 rounded-xl shadow mb-4"
          >
            <p className="text-gray-600">
              Friend Request From
            </p>

            <p className="text-xl font-bold mt-2">
              {request.sender_name}
            </p>

            <button
              onClick={() => acceptRequest(request)}
              className="bg-green-500 text-white px-4 py-2 rounded mt-4"
            >
              Accept
            </button>
          </div>
        ))
      )}
    </main>
  );
}
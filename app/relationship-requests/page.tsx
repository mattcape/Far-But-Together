"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageFrame from "@/components/PageFrame";
import StatusMessage from "@/components/StatusMessage";
import { CARD, FOCUS } from "@/lib/ui";

type Request = {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
};

export default function RelationshipRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function loadRequests() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("significant_other_requests")
        .select("*")
        .eq("receiver_id", user.id);

      if (error) console.error(error);

      if (data) {
        const withNames = await Promise.all(
          data.map(async (request) => {
            const { data: sender } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", request.sender_id)
              .single();

            return {
              ...request,
              sender_name: sender?.display_name || "Unknown user",
            };
          })
        );

        setRequests(withNames);
      }

      setLoaded(true);
    }

    loadRequests();
  }, []);

  async function acceptRequest(request: Request) {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("relationships").insert({
      user_one: request.sender_id,
      user_two: user.id,
    });

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    await supabase.from("significant_other_requests").delete().eq("id", request.id);

    setRequests((current) => current.filter((r) => r.id !== request.id));
    setFailed(false);
    setMessage("Relationship accepted. You're connected.");
  }

  return (
    <PageFrame
      title="Relationship requests"
      subtitle="Accept a request to be someone's partner."
    >
      <StatusMessage message={message} tone={failed ? "error" : "success"} />

      {!loaded ? (
        <p role="status" className="mt-4 text-ink/75">
          Loading...
        </p>
      ) : requests.length === 0 ? (
        <div className={`${CARD} mt-4 p-6 text-ink/80`}>
          No relationship requests.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className={`${CARD} flex items-center justify-between gap-4 p-4`}
            >
              <div>
                <div className="text-sm text-ink/70">Relationship request from</div>
                <div className="font-display text-2xl text-ink">
                  {request.sender_name}
                </div>
              </div>

              <button
                type="button"
                onClick={() => acceptRequest(request)}
                className={`rounded-full bg-rose-deep px-5 py-2 font-semibold text-white hover:brightness-110 ${FOCUS}`}
              >
                Accept
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}

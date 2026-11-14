"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import StatusMessage from "@/components/StatusMessage";
import { supabase } from "@/lib/supabase";
import { isMissingSetup } from "@/lib/relationship";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

type Found = {
  id: string;
  display_name: string;
  state: "new" | "friends" | "sent" | "received";
};

function pretty(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export default function FriendsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myCode, setMyCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [code, setCode] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data } = await supabase
        .from("profiles")
        .select("friend_code")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setUserId(user.id);
      setMyCode(data?.friend_code ?? "");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pretty(myCode));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to read out.
    }
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setFound(null);

    if (!code.trim() || !userId) {
      setFailed(true);
      setMessage("Enter your friend's code.");
      return;
    }

    setBusy(true);

    const { data, error } = await supabase.rpc("find_profile_by_code", {
      p_code: code,
    });

    if (isMissingSetup(error)) {
      setBusy(false);
      setNeedsSetup(true);
      return;
    }

    const person = (data ?? [])[0] as
      | { id: string; display_name: string }
      | undefined;

    if (!person) {
      setBusy(false);
      setFailed(true);
      setMessage("No one has that code. Check it and try again.");
      return;
    }

    // Are you already friends, or is a request already waiting?
    const [{ data: friendships }, { data: requests }] = await Promise.all([
      supabase
        .from("friendships")
        .select("user_one, user_two")
        .or(`user_one.eq.${person.id},user_two.eq.${person.id}`),
      supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${person.id},receiver_id.eq.${person.id}`),
    ]);

    setBusy(false);

    const state: Found["state"] = (friendships ?? []).some(
      (f) => f.user_one === userId || f.user_two === userId
    )
      ? "friends"
      : (requests ?? []).some((r) => r.sender_id === userId)
        ? "sent"
        : (requests ?? []).some((r) => r.receiver_id === userId)
          ? "received"
          : "new";

    setFound({ ...person, state });
  }

  async function addFriend() {
    if (!found || !userId) return;

    setMessage("");

    const { error } = await supabase.from("friend_requests").insert({
      sender_id: userId,
      receiver_id: found.id,
    });

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setFailed(false);
    setFound({ ...found, state: "sent" });
    setMessage(`Friend request sent to ${found.display_name}.`);
  }

  const link = `font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`;

  return (
    <PageFrame
      title="Find friends"
      subtitle="Add someone with their friend code. Nobody can browse a list of members."
    >
      {needsSetup ? (
        <div className={`${CARD} p-6`}>
          <h2 className="font-display text-2xl text-ink">
            This page needs a one-time setup
          </h2>
          <p className="mt-2 leading-relaxed text-ink/75">
            Run the SQL in <code>supabase/privacy.sql</code> in your Supabase
            SQL Editor, then reload.
          </p>
        </div>
      ) : (
        <>
          <section className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Your friend code</h2>
            <p className="mt-2 text-ink/75">
              Share this with people you want as friends. They enter it below
              on their own Find friends page.
            </p>

            {myCode ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-2xl bg-blush px-5 py-3 font-display text-3xl tracking-widest text-rose-deep">
                  {pretty(myCode)}
                </span>
                <button type="button" onClick={copy} className={SECONDARY_BUTTON}>
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-ink/80">
                Your code appears once you&apos;ve{" "}
                <Link href="/onboarding" className={link}>
                  added your name
                </Link>
                .
              </p>
            )}
          </section>

          <form onSubmit={search} className={`${CARD} mt-6 p-6`}>
            <h2 className="font-display text-2xl text-ink">Add a friend</h2>

            <label htmlFor="friend-code" className="mb-1 mt-4 block font-semibold text-ink">
              Their friend code
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="friend-code"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={12}
                placeholder="ABCD-2345"
                className={`${INPUT} uppercase tracking-widest`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button type="submit" disabled={busy} className={`${PRIMARY_BUTTON} shrink-0`}>
                {busy ? "Looking..." : "Find"}
              </button>
            </div>

            <StatusMessage message={message} tone={failed ? "error" : "success"} />
          </form>

          {found ? (
            <div
              className={`${CARD} mt-4 flex items-center justify-between gap-4 p-5`}
            >
              <span className="font-display text-2xl text-ink">
                {found.display_name}
              </span>

              {found.state === "friends" ? (
                <span className="font-semibold text-ink/70">Already friends</span>
              ) : found.state === "sent" ? (
                <span className="font-semibold text-ink/70">Request sent</span>
              ) : found.state === "received" ? (
                <Link href="/friend-requests" className={link}>
                  They already asked you. Accept
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={addFriend}
                  className={`rounded-full bg-rose-deep px-5 py-2 font-semibold text-white hover:brightness-110 ${FOCUS}`}
                >
                  Add friend
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}

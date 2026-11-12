"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import StatusMessage from "@/components/StatusMessage";
import { supabase } from "@/lib/supabase";
import { isMissingTable } from "@/lib/relationship";
import {
  ensureTeamMessage,
  loadRecipients,
  sendMessage,
  type Message,
  type Recipient,
} from "@/lib/messages";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

const STARTERS = [
  "I'm proud of you.",
  "Thinking of you today.",
  "You make my days better.",
  "I can't wait to see you.",
  "Thank you for being you.",
];

const TEAM_NAME = "The Far But Together team";

export default function MailboxPage() {
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      await ensureTeamMessage();

      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, kind, body, created_at, read_at")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (isMissingTable(error)) {
        setNeedsSetup(true);
        setReady(true);
        return;
      }

      const rows = (data ?? []) as Message[];
      const senderIds = [
        ...new Set(rows.map((r) => r.sender_id).filter(Boolean)),
      ] as string[];
      const lookup: Record<string, string> = {};

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", senderIds);

        for (const p of profiles ?? []) lookup[p.id] = p.display_name;
      }

      const people = await loadRecipients(user.id);

      if (cancelled) return;

      setUserId(user.id);
      setMessages(rows);
      setNames(lookup);
      setRecipients(people);
      setTo(people[0]?.id ?? "");
      setReady(true);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;

    const stamp = new Date().toISOString();

    const { error } = await supabase
      .from("messages")
      .update({ read_at: stamp })
      .in("id", ids);

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setMessages((current) =>
      current.map((m) => (ids.includes(m.id) ? { ...m, read_at: stamp } : m))
    );
  }

  async function remove(item: Message) {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", item.id);

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setMessages((current) => current.filter((m) => m.id !== item.id));
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const text = body.trim();

    if (!to) {
      setFailed(true);
      setMessage("Choose who to send it to.");
      return;
    }

    if (!text) {
      setFailed(true);
      setMessage("Write a message first.");
      return;
    }

    setBusy(true);
    const problem = await sendMessage(to, "note", text);
    setBusy(false);

    if (problem) {
      setFailed(true);
      setMessage(problem);
      return;
    }

    const name = recipients.find((r) => r.id === to)?.name ?? "them";

    setFailed(false);
    setMessage(`Sent to ${name}.`);
    setBody("");
  }

  const unread = messages.filter((m) => !m.read_at);

  function who(item: Message): string {
    if (item.kind === "team" || !item.sender_id) return TEAM_NAME;
    return names[item.sender_id] || "Someone";
  }

  return (
    <PageFrame
      title="Mailbox"
      subtitle="Kind words from the people you love, and a note from us every time you visit."
    >
      {!ready ? (
        <SharedPageState kind="loading" />
      ) : needsSetup ? (
        <SharedPageState kind="needs-setup" sqlFile="mailbox.sql" />
      ) : (
        <>
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-ink">
                Inbox
                {unread.length > 0 ? (
                  <span className="ml-3 rounded-full bg-rose-deep px-3 py-1 align-middle text-sm font-semibold text-white">
                    {unread.length} new
                  </span>
                ) : null}
              </h2>

              {unread.length > 0 ? (
                <button
                  type="button"
                  onClick={() => markRead(unread.map((m) => m.id))}
                  className={`rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-ink/15 hover:bg-white ${FOCUS}`}
                >
                  Mark all as read
                </button>
              ) : null}
            </div>

            {messages.length === 0 ? (
              <p className="text-ink/75">Your mailbox is empty.</p>
            ) : (
              <ul className="space-y-3">
                {messages.map((item) => (
                  <li
                    key={item.id}
                    className={`${CARD} p-5 ${
                      item.read_at ? "opacity-80" : "ring-2 ring-rose-deep/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-sm text-ink/70">
                        <span className="font-semibold text-ink">
                          {who(item)}
                        </span>
                        {item.kind === "nudge" ? " is thinking of you" : null}
                        <span className="ml-2">
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {!item.read_at ? (
                          <span className="ml-2 font-semibold text-rose-deep">
                            New
                          </span>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        {!item.read_at ? (
                          <button
                            type="button"
                            onClick={() => markRead([item.id])}
                            className={`rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
                          >
                            Mark read
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          aria-label="Delete this message"
                          className={`rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {item.kind === "nudge" ? null : (
                      <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-ink">
                        {item.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <form onSubmit={send} className={`${CARD} mt-12 p-6`}>
            <h2 className="font-display text-2xl text-ink">Send a kind message</h2>

            {recipients.length === 0 ? (
              <p className="mt-3 text-ink/80">
                Add a friend first, then you can send them a note.
              </p>
            ) : (
              <>
                <label
                  htmlFor="mail-to"
                  className="mb-1 mt-4 block font-semibold text-ink"
                >
                  To
                </label>
                <select
                  id="mail-to"
                  className={INPUT}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.isPartner ? " (partner)" : ""}
                    </option>
                  ))}
                </select>

                <label
                  htmlFor="mail-body"
                  className="mb-1 mt-4 block font-semibold text-ink"
                >
                  Message
                </label>
                <textarea
                  id="mail-body"
                  rows={4}
                  maxLength={500}
                  className={INPUT}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBody(s)}
                      className={`rounded-full bg-white px-3 py-1 text-sm text-ink ring-1 ring-ink/15 hover:bg-blush ${FOCUS}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={busy || !userId}
                  className={`${PRIMARY_BUTTON} mt-5`}
                >
                  {busy ? "Sending..." : "Send message"}
                </button>

                <StatusMessage
                  message={message}
                  tone={failed ? "error" : "success"}
                />
              </>
            )}
          </form>
        </>
      )}
    </PageFrame>
  );
}

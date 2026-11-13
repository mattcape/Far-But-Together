"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
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

type Msg = Message & { receiver_id: string };

const TEAM = "team";
const TEAM_NAME = "Far But Together team";

const STARTERS = [
  "I'm proud of you.",
  "Thinking of you today.",
  "You make my days better.",
  "I can't wait to see you.",
  "Thank you for being you.",
];

type Conversation = {
  key: string; // a person's id, or "team"
  name: string;
  isPartner: boolean;
  messages: Msg[]; // oldest first
  unread: number;
};

function previewOf(m: Msg, mine: boolean): string {
  const text = m.kind === "nudge" ? "Thinking of you" : m.body;
  return mine ? `You: ${text}` : text;
}

function Avatar({ name, team }: { name: string; team?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-xl ${
        team ? "bg-lantern/40 text-ink" : "bg-blush text-rose-deep"
      }`}
    >
      {team ? "F" : name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export default function MailboxPage() {
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Fetches everything sent to or from you.
  const fetchAll = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, kind, body, created_at, read_at")
      .or(`receiver_id.eq.${uid},sender_id.eq.${uid}`)
      .order("created_at", { ascending: true })
      .limit(500);

    if (isMissingTable(error)) return null;

    const rows = (data ?? []) as Msg[];
    const ids = [
      ...new Set(
        rows
          .flatMap((r) => [r.sender_id, r.receiver_id])
          .filter((id): id is string => !!id && id !== uid)
      ),
    ];
    const lookup: Record<string, string> = {};

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);

      for (const p of profiles ?? []) lookup[p.id] = p.display_name;
    }

    return { rows, lookup };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      await ensureTeamMessage();

      const result = await fetchAll(user.id);

      if (cancelled) return;

      if (!result) {
        setNeedsSetup(true);
        setReady(true);
        return;
      }

      const people = await loadRecipients(user.id);

      if (cancelled) return;

      setUserId(user.id);
      setMessages(result.rows);
      setNames(result.lookup);
      setRecipients(people);
      setReady(true);

      // Pick up new messages while the page is open.
      timer = window.setInterval(async () => {
        const fresh = await fetchAll(user.id);

        if (!cancelled && fresh) {
          setMessages(fresh.rows);
          setNames((current) => ({ ...current, ...fresh.lookup }));
        }
      }, 30000);
    }

    load();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [fetchAll]);

  // Group messages into one conversation per person, plus the team's.
  const byKey = new Map<string, Msg[]>();

  for (const m of messages) {
    const key =
      m.kind === "team" || !m.sender_id
        ? TEAM
        : m.sender_id === userId
          ? m.receiver_id
          : m.sender_id;

    byKey.set(key, [...(byKey.get(key) ?? []), m]);
  }

  const conversations: Conversation[] = [];

  for (const [key, msgs] of byKey) {
    const person = recipients.find((r) => r.id === key);

    conversations.push({
      key,
      name: key === TEAM ? TEAM_NAME : person?.name || names[key] || "Someone",
      isPartner: !!person?.isPartner,
      messages: msgs,
      unread: msgs.filter((m) => m.receiver_id === userId && !m.read_at).length,
    });
  }

  // People you can write to but haven't talked with yet.
  for (const r of recipients) {
    if (!byKey.has(r.id)) {
      conversations.push({
        key: r.id,
        name: r.name,
        isPartner: r.isPartner,
        messages: [],
        unread: 0,
      });
    }
  }

  const lastTime = (c: Conversation) =>
    c.messages.length ? c.messages[c.messages.length - 1].created_at : "";

  conversations.sort((a, b) => {
    if (!!lastTime(a) !== !!lastTime(b)) return lastTime(a) ? -1 : 1;
    if (lastTime(a) !== lastTime(b)) return lastTime(a) < lastTime(b) ? 1 : -1;
    return Number(b.isPartner) - Number(a.isPartner);
  });

  const current = conversations.find((c) => c.key === open) ?? null;
  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);
  const currentCount = current?.messages.length ?? 0;

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [open, currentCount]);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;

    const stamp = new Date().toISOString();

    const { error } = await supabase
      .from("messages")
      .update({ read_at: stamp })
      .in("id", ids);

    if (error) return;

    setMessages((all) =>
      all.map((m) => (ids.includes(m.id) ? { ...m, read_at: stamp } : m))
    );
  }

  function openConversation(c: Conversation) {
    setOpen(c.key);
    setBody("");
    setMessage("");

    // Opening a conversation reads what's in it, like a chat app.
    markRead(
      c.messages
        .filter((m) => m.receiver_id === userId && !m.read_at)
        .map((m) => m.id)
    );
  }

  async function removeMessage(m: Msg) {
    const { error } = await supabase.from("messages").delete().eq("id", m.id);

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setMessages((all) => all.filter((x) => x.id !== m.id));
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const text = body.trim();

    if (!open || open === TEAM) return;

    if (!text) {
      setFailed(true);
      setMessage("Write a message first.");
      return;
    }

    setBusy(true);
    const problem = await sendMessage(open, "note", text);

    if (problem) {
      setBusy(false);
      setFailed(true);
      setMessage(problem);
      return;
    }

    const fresh = await fetchAll(userId);

    setBusy(false);
    setBody("");
    setFailed(false);

    if (fresh) setMessages(fresh.rows);
  }

  return (
    <PageFrame
      title="Mailbox"
      subtitle="Kind words from the people you love, and a note from us every morning."
    >
      {!ready ? (
        <SharedPageState kind="loading" />
      ) : needsSetup ? (
        <SharedPageState kind="needs-setup" sqlFile="mailbox.sql" />
      ) : current ? (
        <section aria-label={`Conversation with ${current.name}`}>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(null)}
              className={`rounded-full bg-white/85 px-4 py-2 font-semibold text-ink shadow hover:bg-white ${FOCUS}`}
            >
              ← Conversations
            </button>

            <Avatar name={current.name} team={current.key === TEAM} />
            <h2 className="font-display text-2xl text-ink">{current.name}</h2>
          </div>

          <div className={`${CARD} p-4 sm:p-6`}>
            <div
              role="log"
              aria-live="polite"
              className="max-h-[55vh] min-h-40 space-y-3 overflow-y-auto pr-1"
            >
              {current.messages.length === 0 ? (
                <p className="text-ink/75">
                  No messages yet. Say something kind below.
                </p>
              ) : (
                current.messages.map((m) => {
                  const mine = m.sender_id === userId;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-3xl px-4 py-2 text-lg leading-relaxed ${
                          mine
                            ? "bg-rose-deep text-white"
                            : "bg-blush text-ink"
                        } ${m.kind === "nudge" ? "italic" : ""}`}
                      >
                        {m.kind === "nudge" ? "Thinking of you" : m.body}
                      </div>

                      <div className="mt-1 flex gap-3 text-xs text-ink/65">
                        <span>{format(new Date(m.created_at), "MMM d, h:mm a")}</span>
                        {!mine ? (
                          <button
                            type="button"
                            onClick={() => removeMessage(m)}
                            aria-label="Delete this message"
                            className={`font-semibold hover:text-rose-deep ${FOCUS}`}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {current.key === TEAM ? (
              <p className="mt-4 text-sm text-ink/70">
                A new message from us arrives every morning at 4 am, and the old
                one goes away.
              </p>
            ) : (
              <form onSubmit={send} className="mt-4 border-t border-ink/10 pt-4">
                <label htmlFor="mail-body" className="sr-only">
                  Message to {current.name}
                </label>
                <textarea
                  id="mail-body"
                  rows={2}
                  maxLength={500}
                  className={INPUT}
                  placeholder={`Message ${current.name}`}
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
                  disabled={busy}
                  className={`${PRIMARY_BUTTON} mt-4`}
                >
                  {busy ? "Sending..." : "Send"}
                </button>

                <StatusMessage
                  message={message}
                  tone={failed ? "error" : "success"}
                />
              </form>
            )}
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-ink">
              Conversations
              {totalUnread > 0 ? (
                <span className="ml-3 rounded-full bg-rose-deep px-3 py-1 align-middle text-sm font-semibold text-white">
                  {totalUnread} new
                </span>
              ) : null}
            </h2>

            {totalUnread > 0 ? (
              <button
                type="button"
                onClick={() =>
                  markRead(
                    messages
                      .filter((m) => m.receiver_id === userId && !m.read_at)
                      .map((m) => m.id)
                  )
                }
                className={`rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-ink/15 hover:bg-white ${FOCUS}`}
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          {conversations.length === 0 ? (
            <p className="text-ink/75">
              Nothing here yet. Add a friend to start a conversation.
            </p>
          ) : (
            <ul className="space-y-3">
              {conversations.map((c) => {
                const last = c.messages[c.messages.length - 1];

                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => openConversation(c)}
                      className={`${CARD} flex w-full items-center gap-4 p-4 text-left hover:bg-white ${FOCUS}`}
                    >
                      <Avatar name={c.name} team={c.key === TEAM} />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate font-semibold text-ink">
                            {c.name}
                            {c.isPartner ? (
                              <span className="ml-2 text-sm font-normal text-ink/65">
                                partner
                              </span>
                            ) : null}
                          </span>
                          {last ? (
                            <span className="shrink-0 text-sm text-ink/65">
                              {formatDistanceToNowStrict(new Date(last.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          ) : null}
                        </span>

                        <span
                          className={`mt-0.5 block truncate ${
                            c.unread > 0 ? "font-semibold text-ink" : "text-ink/70"
                          }`}
                        >
                          {last
                            ? previewOf(last, last.sender_id === userId)
                            : "No messages yet"}
                        </span>
                      </span>

                      {c.unread > 0 ? (
                        <span
                          aria-label={`${c.unread} unread`}
                          className="shrink-0 rounded-full bg-rose-deep px-2.5 py-1 text-sm font-semibold text-white"
                        >
                          {c.unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </PageFrame>
  );
}

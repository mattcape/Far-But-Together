import { supabase } from "@/lib/supabase";
import { isMissingTable } from "@/lib/relationship";

export type Message = {
  id: string;
  sender_id: string | null;
  kind: "note" | "nudge" | "team";
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Recipient = {
  id: string;
  name: string;
  isPartner: boolean;
};

const ISSUED_KEY = "fbt-team-message-day";
let running: Promise<void> | null = null;

// The team's message changes at 4 am, so before 4 am it's still "yesterday".
function messageDay(): string {
  const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Makes sure today's message from the team is in the mailbox. A new one
// arrives at 4 am each day and replaces yesterday's. Quietly does nothing if
// the mailbox isn't set up yet.
export function ensureTeamMessage(): Promise<void> {
  if (running) return running;

  running = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user.id;

    if (!userId) return;

    const key = `${userId}:${messageDay()}`;

    try {
      if (localStorage.getItem(ISSUED_KEY) === key) return;
    } catch {
      // Storage blocked: ask the server; it only adds one per day anyway.
    }

    const { error } = await supabase.rpc("issue_team_message", {
      p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });

    if (!error) {
      try {
        localStorage.setItem(ISSUED_KEY, key);
      } catch {
        // Ignore.
      }
    }
  })().finally(() => {
    running = null;
  });

  return running;
}

// null means the mailbox isn't set up (or the count couldn't be read).
export async function countUnread(userId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) return null;

  return count ?? 0;
}

export async function sendMessage(
  receiverId: string,
  kind: "note" | "nudge",
  body: string
): Promise<string | null> {
  const { error } = await supabase
    .from("messages")
    .insert({ receiver_id: receiverId, kind, body });

  if (!error) return null;

  if (isMissingTable(error)) {
    return "The mailbox isn't set up yet. Run supabase/mailbox.sql in Supabase.";
  }

  if (error.code === "42501") {
    return "That didn't send. Wait a few seconds and try again.";
  }

  return error.message;
}

// Your partner first, then your friends.
export async function loadRecipients(userId: string): Promise<Recipient[]> {
  const ids = new Map<string, boolean>();

  const { data: relationships } = await supabase
    .from("relationships")
    .select("user_one, user_two")
    .or(`user_one.eq.${userId},user_two.eq.${userId}`)
    .limit(1);

  const rel = relationships?.[0];

  if (rel) ids.set(rel.user_one === userId ? rel.user_two : rel.user_one, true);

  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_one, user_two")
    .or(`user_one.eq.${userId},user_two.eq.${userId}`);

  for (const f of friendships ?? []) {
    const id = f.user_one === userId ? f.user_two : f.user_one;
    if (!ids.has(id)) ids.set(id, false);
  }

  if (ids.size === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [...ids.keys()]);

  return [...ids.entries()]
    .map(([id, isPartner]) => ({
      id,
      isPartner,
      name:
        profiles?.find((p) => p.id === id)?.display_name ||
        (isPartner ? "Your partner" : "A friend"),
    }))
    .sort((a, b) => Number(b.isPartner) - Number(a.isPartner));
}

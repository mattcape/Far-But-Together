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

const ISSUED_KEY = "fbt-team-message-issued";
let issuing: Promise<void> | null = null;

// Once per visit (browser session), drops a fresh uplifting message from the
// team into the signed-in person's mailbox, so there is always something new.
// Quietly does nothing if the mailbox tables aren't set up yet.
export function ensureTeamMessage(): Promise<void> {
  if (issuing) return issuing;

  try {
    if (sessionStorage.getItem(ISSUED_KEY)) return Promise.resolve();
  } catch {
    // Storage blocked: fall through and issue once for this page load.
  }

  issuing = (async () => {
    const { error } = await supabase.rpc("issue_team_message");

    if (!error) {
      try {
        sessionStorage.setItem(ISSUED_KEY, "1");
      } catch {
        // Ignore.
      }
    }
  })();

  return issuing;
}

// Clears the once-per-visit marker, so the next visit gets a new message.
export function resetTeamMessageMarker() {
  issuing = null;

  try {
    sessionStorage.removeItem(ISSUED_KEY);
  } catch {
    // Ignore.
  }
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

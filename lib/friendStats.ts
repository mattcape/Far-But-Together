import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { loadNicknames, nameFor } from "@/lib/nicknames";
import { longestStreak } from "@/lib/streaks";
import { daysSince, type Stats } from "@/lib/friendship";

export type FriendStats = {
  id: string;
  name: string; // your nickname for them, or their own name
  realName: string;
  stats: Stats;
  messageDays: string[];
};

// Everything about all your friends in three queries: who they are, when you
// became friends, and the days you were in touch.
export async function loadFriendStats(): Promise<FriendStats[]> {
  const user = await getCurrentUser();

  if (!user) return [];

  const { data: friendships } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_one.eq.${user.id},user_two.eq.${user.id}`);

  const since = new Map<string, Date | null>();

  for (const f of friendships ?? []) {
    const id = f.user_one === user.id ? f.user_two : f.user_one;

    since.set(id, f.created_at ? new Date(f.created_at) : null);
  }

  if (since.size === 0) return [];

  const ids = [...since.keys()];

  const [{ data: profiles }, { data: messages }, nicknames] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", ids),
    supabase
      .from("messages")
      .select("sender_id, receiver_id, created_at")
      .not("sender_id", "is", null)
      .limit(5000),
    loadNicknames(),
  ]);

  const daysBy: Record<string, string[]> = {};

  for (const m of messages ?? []) {
    const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;

    if (!since.has(other)) continue;

    (daysBy[other] ??= []).push(format(new Date(m.created_at), "yyyy-MM-dd"));
  }

  const counts: Record<string, number> = {};

  for (const m of messages ?? []) {
    const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;

    counts[other] = (counts[other] ?? 0) + 1;
  }

  return ids.map((id) => {
    const realName =
      profiles?.find((p) => p.id === id)?.display_name || "A friend";
    const start = since.get(id) ?? null;
    const days = daysBy[id] ?? [];

    return {
      id,
      realName,
      name: nameFor(id, realName, nicknames),
      messageDays: days,
      stats: {
        days: start ? daysSince(start) : 0,
        bestStreak: longestStreak(days),
        messages: counts[id] ?? 0,
      },
    };
  });
}

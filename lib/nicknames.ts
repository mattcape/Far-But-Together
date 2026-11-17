import { supabase } from "@/lib/supabase";

export const NICKNAME_MAX = 30;

// Your private nicknames for people, keyed by their user id. Returns an empty
// list if the feature isn't set up yet, so the app still works without it.
export async function loadNicknames(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("friend_nicknames")
    .select("friend_id, nickname");

  if (error) return {};

  const map: Record<string, string> = {};

  for (const row of data ?? []) map[row.friend_id] = row.nickname;

  return map;
}

// Saves a nickname, or removes it when the text is empty. Returns an error
// message, or null when it worked.
export async function saveNickname(
  friendId: string,
  nickname: string
): Promise<string | null> {
  const text = nickname.trim();

  if (!text) {
    const { error } = await supabase
      .from("friend_nicknames")
      .delete()
      .eq("friend_id", friendId);

    return error ? error.message : null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return "Sign in again to save that.";

  const { error } = await supabase.from("friend_nicknames").upsert(
    {
      owner_id: session.user.id,
      friend_id: friendId,
      nickname: text.slice(0, NICKNAME_MAX),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,friend_id" }
  );

  return error ? error.message : null;
}

// What to call someone: your nickname for them, or their own name.
export function nameFor(
  id: string,
  realName: string,
  nicknames: Record<string, string>
): string {
  return nicknames[id] || realName;
}

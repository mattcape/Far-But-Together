import { supabase } from "@/lib/supabase";

// Saves a display name, creating the profile row if it doesn't exist yet.
// Returns an error message, or null when it worked.
export async function saveDisplayName(
  userId: string,
  name: string
): Promise<string | null> {
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", userId)
    .select("id");

  if (error) return error.message;

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, display_name: name });

    if (insertError) return insertError.message;
  }

  return null;
}

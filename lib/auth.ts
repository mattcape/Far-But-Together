import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// The signed-in user, read from the session already stored in the browser.
// This avoids a network round trip on every page. Supabase still checks
// the person's access token on every database request, so this only affects
// speed, not security.
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CARD, FOCUS, SECONDARY_BUTTON } from "@/lib/ui";

type Info = { id: string | number; partnerName: string };

// Ending a relationship, for the rare time it's needed. It removes the
// shared visits, dates, memories (and their photos) and bucket list.
export default function RelationshipSettings() {
  const [info, setInfo] = useState<Info | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data } = await supabase
        .from("relationships")
        .select("id, user_one, user_two")
        .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
        .limit(1);

      const rel = data?.[0];

      if (!rel) return;

      const partnerId = rel.user_one === user.id ? rel.user_two : rel.user_one;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", partnerId)
        .maybeSingle();

      if (!cancelled) {
        setInfo({ id: rel.id, partnerName: profile?.display_name || "your partner" });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function endIt() {
    if (!info) return;

    setBusy(true);
    setError("");

    // Remove the memory photos first, while we can still see which they are.
    const { data: photos } = await supabase
      .from("memories")
      .select("photo_path")
      .eq("relationship_id", info.id)
      .not("photo_path", "is", null);

    const paths = (photos ?? []).map((p) => p.photo_path as string);

    if (paths.length > 0) {
      await supabase.storage.from("memory-photos").remove(paths);
    }

    await supabase.from("visits").delete().eq("relationship_id", info.id);

    const { error: deleteError } = await supabase
      .from("relationships")
      .delete()
      .eq("id", info.id);

    setBusy(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    window.location.href = "/";
  }

  if (!info) return null;

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="font-display text-2xl text-ink">Relationship</h2>
      <p className="mt-2 text-ink/75">
        You&apos;re connected with{" "}
        <span className="font-semibold text-ink">{info.partnerName}</span>.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`${SECONDARY_BUTTON} mt-4`}
        >
          End relationship
        </button>
      ) : (
        <div className="mt-4 rounded-2xl bg-blush p-4">
          <p className="font-semibold text-ink">
            End your relationship with {info.partnerName}?
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            This permanently deletes your shared visits, dates, memories and
            photos, and bucket list for both of you. It can&apos;t be undone.
            Your accounts and friendship stay.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={endIt}
              className={`rounded-full bg-rose-deep px-6 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-60 ${FOCUS}`}
            >
              {busy ? "Ending..." : "Yes, end it"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className={SECONDARY_BUTTON}
            >
              Keep it
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-rose-deep">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

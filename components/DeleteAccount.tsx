"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { CARD, FOCUS, SECONDARY_BUTTON } from "@/lib/ui";

// Permanently deletes your account and everything in it.
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteIt() {
    setBusy(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Remove memory photos first, while we can still find them.
    const { data: relationships } = await supabase
      .from("relationships")
      .select("id")
      .or(`user_one.eq.${user.id},user_two.eq.${user.id}`);

    const ids = (relationships ?? []).map((r) => r.id);

    if (ids.length > 0) {
      const { data: photos } = await supabase
        .from("memories")
        .select("photo_path")
        .in("relationship_id", ids)
        .not("photo_path", "is", null);

      const paths = (photos ?? []).map((p) => p.photo_path as string);

      if (paths.length > 0) {
        await supabase.storage.from("memory-photos").remove(paths);
      }
    }

    const { error: deleteError } = await supabase.rpc("delete_my_account");

    if (deleteError) {
      setBusy(false);
      setError(
        deleteError.code === "PGRST202"
          ? "Account deletion isn't set up yet. Run supabase/privacy.sql in Supabase."
          : deleteError.message
      );
      return;
    }

    await supabase.auth.signOut();

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore.
    }

    window.location.href = "/";
  }

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="font-display text-2xl text-ink">Delete my account</h2>
      <p className="mt-2 leading-relaxed text-ink/75">
        Permanently deletes your account, check-ins, messages, letters and
        community posts. If you&apos;re in a relationship, the shared visits,
        dates, memories, photos and bucket list are deleted for both of you.
        This can&apos;t be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${SECONDARY_BUTTON} mt-4`}
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 rounded-2xl bg-blush p-4">
          <label htmlFor="confirm-delete" className="block font-semibold text-ink">
            Type DELETE to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-ink"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || typed !== "DELETE"}
              onClick={deleteIt}
              className={`rounded-full bg-rose-deep px-6 py-2 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
            >
              {busy ? "Deleting..." : "Permanently delete"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className={SECONDARY_BUTTON}
            >
              Keep my account
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

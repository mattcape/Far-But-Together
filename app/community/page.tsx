"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { isMissingSetup, isMissingTable } from "@/lib/relationship";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type Post = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};

const MAX = 500;

export default function CommunityPage() {
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      const { data, error: loadError } = await supabase.rpc("community_feed");

      if (cancelled) return;

      if (isMissingSetup(loadError)) {
        setNeedsSetup(true);
        setReady(true);
        return;
      }

      const rows = (data ?? []) as (Post & { author_name: string })[];
      const lookup: Record<string, string> = {};

      for (const r of rows) lookup[r.author_id] = r.author_name;

      if (cancelled) return;

      setUserId(user.id);
      setNames(lookup);
      setPosts(rows.map((r) => ({ ...r, })));
      setReady(true);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function post(e: FormEvent) {
    e.preventDefault();
    setError("");

    const text = body.trim();

    if (!text) {
      setError("Write something first.");
      return;
    }

    if (!userId) return;

    setBusy(true);

    const { data, error: insertError } = await supabase
      .from("community_posts")
      .insert({ author_id: userId, body: text })
      .select("id, author_id, body, created_at")
      .single();

    setBusy(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't post that.");
      return;
    }

    // Make sure our own name is known for the new post.
    if (!names[userId]) {
      const { data: me } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      if (me?.display_name) {
        setNames((current) => ({ ...current, [userId]: me.display_name }));
      }
    }

    setPosts((current) => [{ ...data, }, ...current]);
    setBody("");
  }

  async function report(item: Post) {
    if (
      !window.confirm(
        "Report this post? It will be hidden from you right away, and hidden from everyone once enough people report it."
      )
    )
      return;

    setError("");

    const { error: reportError } = await supabase
      .from("community_reports")
      .insert({ post_id: item.id, reporter_id: userId });

    if (reportError) {
      setError(
        isMissingTable(reportError)
          ? "Reporting isn't set up yet. Run supabase/community-reports.sql in Supabase."
          : reportError.message
      );
      return;
    }

    setPosts((current) => current.filter((p) => p.id !== item.id));
    setNotice("Thanks. That post is hidden from you.");
  }

  async function remove(item: Post) {
    if (!window.confirm("Delete this post?")) return;

    const { error: deleteError } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setPosts((current) => current.filter((p) => p.id !== item.id));
  }

  return (
    <PageFrame
      title="Community"
      subtitle="Share a short message with everyone using Far But Together. Everyone signed in can read it."
    >
      {!ready ? (
        <SharedPageState kind="loading" />
      ) : needsSetup ? (
        <SharedPageState kind="needs-setup" sqlFile="privacy.sql" />
      ) : (
        <>
          <form onSubmit={post} className={`${CARD} p-6`}>
            <label
              htmlFor="community-body"
              className="mb-1 block font-semibold text-ink"
            >
              Say something to the community
            </label>
            <textarea
              id="community-body"
              rows={3}
              maxLength={MAX}
              className={INPUT}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-1 text-right text-sm text-ink/65">
              {body.length}/{MAX}
            </div>

            {notice ? (
              <p role="status" className="mt-2 text-sm font-semibold text-ink">
                {notice}
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-rose-deep">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={`${PRIMARY_BUTTON} mt-3`}>
              {busy ? "Posting..." : "Post"}
            </button>
          </form>

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">Latest</h2>

          {posts.length === 0 ? (
            <p className="text-ink/75">Nothing here yet. Write the first post above.</p>
          ) : (
            <ul className="space-y-4">
              {posts.map((item) => (
                <li
                  key={item.id}
                  className={`${CARD} flex items-start justify-between gap-4 p-5`}
                >
                  <div>
                    <div className="font-semibold text-ink">
                      {names[item.author_id] || "Someone"}
                      <span className="ml-2 text-sm font-normal text-ink/65">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink/85">
                      {item.body}
                    </p>
                  </div>

                  {item.author_id === userId ? (
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      aria-label="Delete your post"
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => report(item)}
                      aria-label={`Report post by ${names[item.author_id] || "someone"}`}
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
                    >
                      Report
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageFrame>
  );
}

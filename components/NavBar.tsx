"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { countUnread, ensureTeamMessage } from "@/lib/messages";
import { notificationsOn } from "@/components/AppearanceSettings";

// Pages that have their own full-screen look and don't need the bar.
const HIDDEN_ON = [
  "/",
  "/login",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
];

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default function NavBar() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [unread, setUnread] = useState<number | null>(null);
  const lastUnread = useRef<number | null>(null);

  // Each visit drops a team message in the mailbox; keep the count fresh as
  // people move around and while the page stays open.
  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      await ensureTeamMessage();

      const count = await countUnread(user.id);

      if (cancelled) return;

      setUnread(count);

      // Show the count in the tab title.
      const base = document.title.replace(/^\(\d+\)\s/, "");
      document.title = count && count > 0 ? `(${count}) ${base}` : base;

      // A pop-up when something new arrives while the tab is open.
      if (
        count !== null &&
        lastUnread.current !== null &&
        count > lastUnread.current &&
        notificationsOn()
      ) {
        new Notification("Far But Together", {
          body: "You have a new message in your mailbox.",
        });
      }

      lastUnread.current = count;
    }

    refresh();
    const id = window.setInterval(refresh, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [signedIn, pathname]);

  if (HIDDEN_ON.includes(pathname)) return null;

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <nav
      aria-label="Main"
      className="flex items-center justify-between gap-4 border-b border-ink/10 bg-white/80 px-6 py-3 backdrop-blur"
    >
      <Link
        href="/"
        className={`font-display text-xl text-ink ${FOCUS}`}
      >
        Far But Together
      </Link>

      <div className="flex items-center gap-5 text-sm font-semibold text-ink">
        {signedIn === false ? (
          <Link href="/login" className={`hover:underline ${FOCUS}`}>
            Log in
          </Link>
        ) : (
          <>
            <Link href="/dashboard" className={`hover:underline ${FOCUS}`}>
              Dashboard
            </Link>
            {signedIn && unread !== null ? (
              <Link href="/mailbox" className={`hover:underline ${FOCUS}`}>
                Mailbox
                {unread > 0 ? (
                  <span className="ml-1.5 rounded-full bg-rose-deep px-2 py-0.5 text-xs text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {signedIn ? (
              <button
                type="button"
                onClick={signOut}
                className={`rounded-full bg-rose-deep px-4 py-1.5 text-white hover:brightness-110 ${FOCUS}`}
              >
                Sign out
              </button>
            ) : null}
          </>
        )}
      </div>
    </nav>
  );
}

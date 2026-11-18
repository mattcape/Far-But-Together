"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { countUnread, ensureTeamMessage } from "@/lib/messages";
import { notificationsOn } from "@/components/AppearanceSettings";
import { getCurrentUser } from "@/lib/auth";

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
      const user = await getCurrentUser();

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
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink/10 bg-white/80 px-4 py-2 backdrop-blur sm:px-6 sm:py-3"
    >
      <Link
        href="/"
        className={`flex items-center gap-2 whitespace-nowrap py-2 font-display text-lg text-ink sm:text-xl ${FOCUS}`}
      >
        <Heart
          className="h-5 w-5 fill-[#ff3d7f] text-[#ff3d7f]"
          aria-hidden="true"
        />
        Far But Together
      </Link>

      <div className="flex items-center gap-3 text-sm font-semibold text-ink sm:gap-5">
        {signedIn === false ? (
          <Link
            href="/login"
            className={`whitespace-nowrap py-2 hover:underline ${FOCUS}`}
          >
            Log in
          </Link>
        ) : (
          <>
            {signedIn && unread !== null ? (
              <Link
                href="/mailbox"
                className={`whitespace-nowrap py-2 hover:underline ${FOCUS}`}
              >
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
                className={`whitespace-nowrap rounded-full bg-rose-deep px-4 py-2 text-white hover:brightness-110 ${FOCUS}`}
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

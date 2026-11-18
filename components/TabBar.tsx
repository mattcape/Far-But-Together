"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TABS, tabFor } from "@/lib/destinations";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink";

// The five places everything lives, fixed to the bottom of the screen
// once you're signed in and inside the app.
export default function TabBar() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(!!session)
    );

    return () => subscription.unsubscribe();
  }, []);

  const current = tabFor(pathname);

  if (!signedIn || !current) return null;

  return (
    <>
      {/* Keeps the end of every page clear of the bar. */}
      <div aria-hidden="true" className="h-[calc(4.25rem+env(safe-area-inset-bottom))]" />

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.href === current.href;

            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 text-xs font-semibold ${
                    active ? "text-rose-deep" : "text-ink/70"
                  } ${FOCUS}`}
                >
                  <Icon
                    className={`h-6 w-6 ${active ? "fill-rose-deep/15" : ""}`}
                    aria-hidden="true"
                  />
                  {tab.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

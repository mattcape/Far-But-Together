"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Pages that have their own full-screen look and don't need the bar.
const HIDDEN_ON = ["/", "/login", "/register", "/onboarding"];

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

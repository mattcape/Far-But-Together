"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Pages anyone can open without logging in.
const PUBLIC_PATHS = ["/", "/login", "/register"];

// Sends logged-out visitors to /login when they open an inner page, and
// keeps the page hidden until we know they're signed in.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(!!data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isPublic && signedIn === false) router.replace("/login");
  }, [isPublic, signedIn, router]);

  if (isPublic) return <>{children}</>;

  if (signedIn !== true) {
    return (
      <p role="status" className="p-8 text-center text-ink/75">
        Loading...
      </p>
    );
  }

  return <>{children}</>;
}

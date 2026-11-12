"use client";

import { useEffect } from "react";

const KEY = "fbt-home-scroll";

// Remembers how far down the homepage you were, so coming back from another
// page puts you in the same spot instead of at the top.
export default function ScrollMemory() {
  useEffect(() => {
    let saved = 0;

    try {
      saved = Number(sessionStorage.getItem(KEY)) || 0;
    } catch {
      // Storage can be blocked; start at the top.
    }

    // Try a few times: the page can still be settling (data loading, the
    // browser resetting scroll) right after we arrive.
    const timers: number[] = [];

    if (saved > 0) {
      for (const delay of [0, 60, 200, 500]) {
        timers.push(window.setTimeout(() => window.scrollTo(0, saved), delay));
      }
    }

    function remember() {
      try {
        sessionStorage.setItem(KEY, String(Math.round(window.scrollY)));
      } catch {
        // Ignore.
      }
    }

    // Start remembering only after the restore attempts finish, so the
    // page's own jump to the top isn't saved over the real position.
    const start = window.setTimeout(
      () => window.addEventListener("scroll", remember, { passive: true }),
      saved > 0 ? 600 : 0
    );

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(start);
      window.removeEventListener("scroll", remember);
    };
  }, []);

  return null;
}

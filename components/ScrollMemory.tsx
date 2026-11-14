"use client";

import { useEffect } from "react";

// Remembers how far down a page you were, so coming back from another page
// puts you in the same spot instead of at the top. Each page uses its own key.
export default function ScrollMemory({
  storageKey = "fbt-home-scroll",
}: {
  storageKey?: string;
}) {
  useEffect(() => {
    let saved = 0;

    try {
      saved = Number(sessionStorage.getItem(storageKey)) || 0;
    } catch {
      // Storage can be blocked; start at the top.
    }

    function remember() {
      try {
        sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
      } catch {
        // Ignore.
      }
    }

    const timers: number[] = [];
    let tracking = false;

    function startTracking() {
      if (tracking) return;
      tracking = true;
      window.addEventListener("scroll", remember, { passive: true });
    }

    // Anything the person does themselves ends the restore attempts, so we
    // never fight their scrolling.
    function stopRestoring() {
      timers.forEach(clearTimeout);
      startTracking();
    }

    const interactions = ["wheel", "touchstart", "keydown", "mousedown"];

    if (saved > 0) {
      // Try several times: the page can still be settling (data loading,
      // the browser resetting scroll) right after we arrive.
      for (const delay of [0, 60, 200, 500, 1000, 1800]) {
        timers.push(window.setTimeout(() => window.scrollTo(0, saved), delay));
      }

      // Start remembering only after the restore attempts finish, so the
      // page's own jump to the top isn't saved over the real position.
      timers.push(window.setTimeout(startTracking, 2000));

      for (const name of interactions) {
        window.addEventListener(name, stopRestoring, {
          once: true,
          passive: true,
        });
      }
    } else {
      startTracking();
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("scroll", remember);

      for (const name of interactions) {
        window.removeEventListener(name, stopRestoring);
      }
    };
  }, [storageKey]);

  return null;
}

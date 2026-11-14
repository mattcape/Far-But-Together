"use client";

import Link from "next/link";
import {
  CARD,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SKY_BACKGROUND,
} from "@/lib/ui";

export default function ErrorPage({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{ background: SKY_BACKGROUND }}
    >
      <div className={`${CARD} max-w-md p-8 text-center`}>
        <h1 className="font-display text-4xl text-ink">Something went wrong</h1>
        <p className="mt-3 leading-relaxed text-ink/80">
          This page hit a problem. Your information is safe. Try again, and if
          it keeps happening, go back to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => unstable_retry()} className={PRIMARY_BUTTON}>
            Try again
          </button>
          <Link href="/dashboard" className={SECONDARY_BUTTON}>
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

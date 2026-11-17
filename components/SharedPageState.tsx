import Link from "next/link";
import { CARD, FOCUS } from "@/lib/ui";

type Kind = "loading" | "no-relationship" | "needs-setup";

// The message shown instead of a shared page's content when there is
// nothing to show yet.
export default function SharedPageState({
  kind,
  sqlFile = "dates-and-memories.sql",
}: {
  kind: Kind;
  sqlFile?: string;
}) {
  const link = `font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`;

  if (kind === "loading") {
    // A placeholder shaped like the content, so the page doesn't jump when
    // it arrives.
    return (
      <div role="status" aria-label="Loading" className="space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`${CARD} animate-pulse space-y-3 p-6 motion-reduce:animate-none`}
          >
            <div className="h-6 w-1/3 rounded-full bg-ink/10" />
            <div className="h-4 w-full rounded-full bg-ink/10" />
            <div className="h-4 w-2/3 rounded-full bg-ink/10" />
          </div>
        ))}
      </div>
    );
  }

  if (kind === "no-relationship") {
    return (
      <div className={`${CARD} p-6`}>
        <h2 className="font-display text-2xl text-ink">
          This page is shared with your partner
        </h2>
        <p className="mt-2 leading-relaxed text-ink/75">
          You&apos;ll be able to use it once you&apos;re connected.{" "}
          <Link href="/friends" className={link}>
            Add a friend
          </Link>
          , then send them a relationship request from{" "}
          <Link href="/friends-list" className={link}>
            My friends
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={`${CARD} p-6`}>
      <h2 className="font-display text-2xl text-ink">
        This page needs a one-time setup
      </h2>
      <p className="mt-2 leading-relaxed text-ink/75">
        The database tables for this page haven&apos;t been created yet. Run
        the SQL in <code>supabase/{sqlFile}</code> in your
        Supabase SQL Editor, then reload.
      </p>
    </div>
  );
}

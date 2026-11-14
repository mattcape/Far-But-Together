import Link from "next/link";
import { CARD, PRIMARY_BUTTON, SKY_BACKGROUND } from "@/lib/ui";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{ background: SKY_BACKGROUND }}
    >
      <div className={`${CARD} max-w-md p-8 text-center`}>
        <h1 className="font-display text-4xl text-ink">Page not found</h1>
        <p className="mt-3 leading-relaxed text-ink/80">
          That page doesn&apos;t exist, or it moved. Head back and pick up
          where you left off.
        </p>
        <Link href="/dashboard" className={`${PRIMARY_BUTTON} mt-6 inline-block`}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

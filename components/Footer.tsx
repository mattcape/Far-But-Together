import Link from "next/link";

// Links to the legal pages, shown at the bottom of every page.
export default function Footer() {
  const link =
    "rounded px-1 underline decoration-ink/40 underline-offset-4 hover:decoration-rose-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <footer className="px-6 py-6 text-center text-sm text-ink/75">
      <nav aria-label="Legal" className="flex justify-center gap-5">
        <Link href="/privacy" className={link}>
          Privacy policy
        </Link>
        <Link href="/terms" className={link}>
          Terms of use
        </Link>
      </nav>
    </footer>
  );
}

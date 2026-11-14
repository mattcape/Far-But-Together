"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCUS } from "@/lib/ui";

// Public pages have no dashboard to go back to.
const PUBLIC_PAGES = ["/privacy", "/terms"];

// The way back from any page. Inside the app it returns to the dashboard,
// with a smaller link to the homepage. On the dashboard itself it goes home.
export default function HomeButton() {
  const pathname = usePathname();

  const button = `inline-block rounded-full bg-white/85 px-4 py-2 font-semibold text-ink shadow hover:bg-white ${FOCUS}`;

  if (pathname === "/dashboard" || PUBLIC_PAGES.includes(pathname)) {
    return (
      <Link href="/" className={`mb-6 ${button}`}>
        ← Back to Home
      </Link>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Link href="/dashboard" className={button}>
        ← Dashboard
      </Link>
      <Link
        href="/"
        className={`rounded-full px-3 py-2 text-sm font-semibold text-ink/75 underline decoration-rose-deep decoration-2 underline-offset-4 hover:text-ink ${FOCUS}`}
      >
        Home
      </Link>
    </div>
  );
}

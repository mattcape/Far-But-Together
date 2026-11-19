"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabFor } from "@/lib/destinations";
import { FOCUS } from "@/lib/ui";

// Public pages have no tabs to go back to.
const PUBLIC_PAGES = ["/privacy", "/terms"];

const button = `inline-block rounded-full bg-white/85 px-3.5 py-1.5 text-sm font-semibold text-ink shadow hover:bg-white ${FOCUS}`;

// The way back from a page. The five tab pages need none, because the tab
// bar is right there; other pages return to the tab they belong to.
export default function HomeButton() {
  const pathname = usePathname();

  if (PUBLIC_PAGES.includes(pathname)) {
    return (
      <Link href="/" className={`mb-3 ${button}`}>
        ← Back to Home
      </Link>
    );
  }

  const tab = tabFor(pathname);

  if (!tab || tab.href === pathname) return null;

  return (
    <Link href={tab.href} className={`mb-3 ${button}`}>
      ← {tab.title}
    </Link>
  );
}

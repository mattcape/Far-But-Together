"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUB_TABS } from "@/lib/destinations";
import { FOCUS } from "@/lib/ui";

// A second row of tabs for pages that belong together, like the check-in
// page, the feed and the question of the day.
export default function SubTabs() {
  const pathname = usePathname();
  const group = SUB_TABS.find((g) => g.paths.includes(pathname));

  if (!group) return null;

  return (
    <nav aria-label="Related pages" className="-mx-1 mb-3 overflow-x-auto px-1">
      <ul className="flex gap-2">
        {group.items.map((item) => {
          const active = item.href === pathname;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                  active
                    ? "bg-rose-deep text-white"
                    : "bg-white/85 text-ink hover:bg-white"
                } ${FOCUS}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

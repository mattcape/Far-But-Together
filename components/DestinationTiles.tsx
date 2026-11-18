import Link from "next/link";
import type { Destination } from "@/lib/destinations";
import { FOCUS } from "@/lib/ui";

// A grid of icon tiles, one per page. Used on the hub pages.
export default function DestinationTiles({ items }: { items: Destination[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((d) => {
        const Icon = d.icon;

        return (
          <li key={d.href}>
            <Link
              href={d.href}
              className={`flex h-full flex-col items-start gap-2 rounded-2xl bg-white/85 p-4 font-semibold text-ink shadow-[0_10px_24px_-18px_rgba(42,40,80,0.5)] hover:bg-white ${FOCUS}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blush">
                <Icon className="h-5 w-5 text-rose-deep" aria-hidden="true" />
              </span>
              <span>{d.title}</span>
              <span className="text-sm font-normal leading-snug text-ink/75">
                {d.description}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";
import {
  PLAN_AND_REMEMBER,
  PEOPLE,
  ACCOUNT,
  type Destination,
} from "@/lib/destinations";
import { CARD, FOCUS } from "@/lib/ui";

const GROUPS: { title: string; items: Destination[] }[] = [
  { title: "Plan and remember", items: PLAN_AND_REMEMBER },
  {
    title: "People",
    items: PEOPLE,
  },
  {
    // The dashboard is already this page.
    title: "Your account",
    items: ACCOUNT.filter((d) => d.href !== "/dashboard"),
  },
];

// Every tool in the app, so the dashboard is a place to start from.
export default function ToolLinks() {
  return (
    <section className={`${CARD} mt-6 p-6 sm:p-8`}>
      <h2 className="font-display text-2xl text-ink">Everything else</h2>

      {GROUPS.map((group) => (
        <div key={group.title} className="mt-5">
          <h3 className="font-semibold text-ink/75">{group.title}</h3>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.items.map((d) => {
              const Icon = d.icon;

              return (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    title={d.description}
                    className={`flex h-full flex-col items-start gap-2 rounded-2xl bg-white/80 p-4 font-semibold text-ink ring-1 ring-ink/10 hover:bg-white ${FOCUS}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush">
                      <Icon
                        className="h-5 w-5 text-rose-deep"
                        aria-hidden="true"
                      />
                    </span>
                    {d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

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
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.items.map((d) => {
              const Icon = d.icon;

              return (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    title={d.description}
                    className={`flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-semibold text-ink ring-1 ring-ink/10 hover:bg-white ${FOCUS}`}
                  >
                    <Icon
                      className="h-4 w-4 text-rose-deep"
                      aria-hidden="true"
                    />
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

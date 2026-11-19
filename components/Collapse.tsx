import { ChevronDown } from "lucide-react";
import { CARD, FOCUS } from "@/lib/ui";

// A card that shows only its title until you tap it. Keeps long pages short.
export default function Collapse({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className={`${CARD} group`} open={defaultOpen}>
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl p-3.5 font-display text-xl text-ink sm:p-6 sm:text-2xl [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        {title}
        <ChevronDown
          className="h-5 w-5 shrink-0 text-rose-deep transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
    </details>
  );
}

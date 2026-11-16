"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { parseDay } from "@/lib/relationship";
import { myTimeZone } from "@/lib/tz";
import { CARD, FOCUS } from "@/lib/ui";

type Nudge = { key: string; text: string; href: string; action: string };

// Gentle reminders on the dashboard. Each one links to the page where you
// can act on it, and the whole card disappears when there is nothing to say.
export default function Nudges({
  relationshipId,
  checkedInToday,
  visitDate,
}: {
  relationshipId: string | number | null;
  checkedInToday: boolean;
  visitDate: Date | null;
}) {
  const [extra, setExtra] = useState<Nudge[]>([]);

  useEffect(() => {
    if (relationshipId === null) return;

    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const found: Nudge[] = [];
      const today = format(new Date(), "yyyy-MM-dd");

      // A surprise that has unlocked and is waiting to be opened.
      const { data: surprises } = await supabase.rpc("my_surprises", {
        p_tz: myTimeZone(),
      });

      const waiting = (
        (surprises ?? []) as {
          recipient_id: string;
          unlocked: boolean;
          opened_at: string | null;
        }[]
      ).filter((s) => s.recipient_id === user.id && s.unlocked && !s.opened_at);

      if (waiting.length > 0) {
        found.push({
          key: "surprise",
          text:
            waiting.length === 1
              ? "You have a surprise waiting."
              : `You have ${waiting.length} surprises waiting.`,
          href: "/surprises",
          action: "Open",
        });
      }

      // Your partner's photo today, before you've shared yours.
      const { data: photos } = await supabase
        .from("daily_photos")
        .select("user_id")
        .eq("relationship_id", relationshipId)
        .eq("photo_day", today);

      if (photos) {
        const mine = photos.some((p) => p.user_id === user.id);
        const theirs = photos.some((p) => p.user_id !== user.id);

        if (theirs && !mine) {
          found.push({
            key: "photo",
            text: "Your partner shared a photo today. Share yours back.",
            href: "/photos",
            action: "See photos",
          });
        }
      }

      // The soonest countdown, if it is close.
      const { data: countdowns } = await supabase
        .from("countdowns")
        .select("title, target_on")
        .eq("relationship_id", relationshipId)
        .gte("target_on", today)
        .order("target_on", { ascending: true })
        .limit(1);

      const next = countdowns?.[0];

      if (next) {
        const days = differenceInCalendarDays(
          parseDay(next.target_on),
          new Date(),
        );

        if (days <= 7) {
          found.push({
            key: "countdown",
            text:
              days === 0
                ? `${next.title} is today.`
                : `${days} day${days === 1 ? "" : "s"} until ${next.title}.`,
            href: "/countdowns",
            action: "Countdowns",
          });
        }
      }

      if (!cancelled) setExtra(found);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [relationshipId]);

  const nudges: Nudge[] = [...extra];

  if (visitDate) {
    const days = differenceInCalendarDays(visitDate, new Date());

    if (days >= 1 && days <= 3) {
      nudges.push({
        key: "visit",
        text: `You'll see each other in ${days} day${days === 1 ? "" : "s"}. Plan something for it?`,
        href: "/dates",
        action: "Plan a date",
      });
    }
  }

  if (!checkedInToday && relationshipId !== null) {
    nudges.push({
      key: "checkin",
      text: "You haven't checked in today.",
      href: "/checkins",
      action: "Check in",
    });
  }

  if (nudges.length === 0) return null;

  return (
    <section aria-label="Reminders" className={`${CARD} mb-6 p-5`}>
      <ul className="space-y-3">
        {nudges.map((n) => (
          <li
            key={n.key}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-ink/90">{n.text}</span>
            <Link
              href={n.href}
              className={`rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-rose-deep ring-1 ring-ink/10 hover:bg-blush ${FOCUS}`}
            >
              {n.action}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

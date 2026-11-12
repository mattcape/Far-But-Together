"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookHeart,
  CalendarHeart,
  HeartHandshake,
  Images,
  LayoutDashboard,
  Mail,
  MessagesSquare,
  Plane,
  Settings,
  Smile,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import CloudIntro from "@/components/CloudIntro";
import CloudShape from "@/components/CloudShape";
import ConnectionArc from "@/components/ConnectionArc";
import { loadHomeData, type HomeData } from "@/lib/relationship";

type Destination = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  soon?: boolean;
};

const TOGETHER: Destination[] = [
  {
    href: "/checkins",
    title: "Daily check-in",
    description: "Share your mood and what you're grateful for today.",
    icon: Smile,
  },
  {
    href: "/checkins/view",
    title: "Check-in feed",
    description: "Read everything you've both shared.",
    icon: BookHeart,
  },
  {
    href: "/visits",
    title: "Next visit",
    description: "Set the date you'll see each other next.",
    icon: Plane,
  },
];

const PLAN_AND_REMEMBER: Destination[] = [
  {
    href: "/dates",
    title: "Dates",
    description: "Plans for the time you spend together.",
    icon: CalendarHeart,
    soon: true,
  },
  {
    href: "/memories",
    title: "Memories",
    description: "Moments you want to keep.",
    icon: Images,
    soon: true,
  },
];

const PEOPLE: Destination[] = [
  {
    href: "/friends",
    title: "Find friends",
    description: "Send a friend request to someone you know.",
    icon: UserPlus,
  },
  {
    href: "/friends-list",
    title: "My friends",
    description: "See your friends and send a relationship request.",
    icon: Users,
  },
  {
    href: "/friend-requests",
    title: "Friend requests",
    description: "Accept requests from other people.",
    icon: Mail,
  },
  {
    href: "/relationship-requests",
    title: "Relationship requests",
    description: "Accept a request to be someone's partner.",
    icon: HeartHandshake,
  },
  {
    href: "/community",
    title: "Community",
    description: "Connect with other people.",
    icon: MessagesSquare,
    soon: true,
  },
];

const ACCOUNT: Destination[] = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Your countdown and your partner's latest check-in.",
    icon: LayoutDashboard,
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Manage your account.",
    icon: Settings,
    soon: true,
  },
];

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function visitLine(days: number): string {
  if (days === 0) return "You're together today.";
  if (days === 1) return "Your next visit is tomorrow.";
  return `Your next visit is in ${days} days.`;
}

function Status({ data }: { data: HomeData }) {
  const link = `font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4 ${FOCUS}`;

  if (!data.name) {
    return (
      <p className="mt-3 text-lg text-ink/85">
        <Link href="/onboarding" className={link}>
          Add your name
        </Link>{" "}
        so your partner sees who you are.
      </p>
    );
  }

  if (data.partnerName && data.daysToNextVisit !== null) {
    return (
      <p className="mt-3 text-lg font-semibold text-ink">
        {visitLine(data.daysToNextVisit)}
      </p>
    );
  }

  if (data.partnerName) {
    return (
      <p className="mt-3 text-lg text-ink/85">
        <Link href="/visits" className={link}>
          Set your next visit date
        </Link>{" "}
        to start a countdown.
      </p>
    );
  }

  return (
    <p className="mt-3 text-lg text-ink/85">
      <Link href="/friends" className={link}>
        Add a friend
      </Link>
      , then send them a relationship request.
    </p>
  );
}

function FeatureTile({
  destination,
  href,
}: {
  destination: Destination;
  href: string;
}) {
  const Icon = destination.icon;

  return (
    <Link
      href={href}
      className={`flex flex-col rounded-[28px] bg-white/85 p-6 shadow-[0_18px_40px_-22px_rgba(42,40,80,0.45)] hover:bg-white ${FOCUS}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blush text-rose-deep">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="mt-6 font-display text-2xl text-ink">
        {destination.title}
      </div>
      <div className="mt-2 leading-relaxed text-ink/75">
        {destination.description}
      </div>
    </Link>
  );
}

function ListLink({
  destination,
  href,
}: {
  destination: Destination;
  href: string;
}) {
  const Icon = destination.icon;

  return (
    <Link
      href={href}
      className={`flex items-start gap-4 rounded-2xl bg-white/60 p-4 ring-1 ring-white/80 hover:bg-white/90 ${FOCUS}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-rose-deep">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{destination.title}</span>
          {destination.soon ? (
            <span className="rounded-full bg-lantern/30 px-2 py-0.5 text-xs font-medium text-ink">
              Coming soon
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-sm leading-relaxed text-ink/75">
          {destination.description}
        </div>
      </div>
    </Link>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14 first:mt-0">
      <h2 className="mb-5 font-display text-2xl text-ink sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadHomeData().then((result) => {
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Signed-out visitors are sent to log in; until we know, link straight through.
  const signedOut = data !== null && !data.signedIn;
  const target = (href: string) => (signedOut ? "/login" : href);

  const primaryButton = `rounded-full bg-rose-deep px-7 py-3 font-semibold text-white hover:brightness-110 ${FOCUS}`;
  const secondaryButton = `rounded-full bg-white/80 px-7 py-3 font-semibold text-ink ring-1 ring-ink/15 hover:bg-white ${FOCUS}`;

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background:
          "linear-gradient(180deg, #bfddf2 0%, #eaf1f7 38%, #f9e6df 100%)",
      }}
    >
      <CloudIntro />

      <main>
        <section className="relative isolate overflow-hidden px-6 pb-28 pt-16 text-center sm:pt-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[36vw] min-h-48"
            style={{
              maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 50%, transparent 100%)",
            }}
          >
            <div className="cloud-idle absolute -bottom-6 -left-[10vw] w-[60vw]">
              <CloudShape className="w-full text-white/80" />
            </div>
            <div className="cloud-idle absolute -bottom-10 -right-[12vw] w-[70vw]">
              <CloudShape className="w-full text-white/70" />
            </div>
            <div className="cloud-idle absolute -bottom-4 left-[34vw] w-[34vw]">
              <CloudShape className="w-full text-white/60" />
            </div>
          </div>

          <ConnectionArc
            leftName={data?.signedIn ? data.name : null}
            rightName={data?.signedIn ? data.partnerName : null}
          />

          <h1 className="mt-6 text-balance font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-7xl">
            Far But Together
          </h1>

          {data?.signedIn ? (
            <>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink/85">
                {data.name ? `Welcome back, ${data.name}.` : "Welcome back."}
              </p>
              <Status data={data} />
            </>
          ) : (
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed text-ink/85">
              Check in each day, count down to your next visit, and stay close,
              wherever you are.
            </p>
          )}

          <div className="mt-8 flex min-h-12 flex-wrap items-center justify-center gap-3">
            {data === null ? null : data.signedIn ? (
              <Link href="/dashboard" className={primaryButton}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={primaryButton}>
                  Log in
                </Link>
                <Link href="/register" className={secondaryButton}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 pb-24">
          {signedOut ? (
            <p className="mb-10 mt-2 text-ink/80">
              Log in to open any of these pages.
            </p>
          ) : null}

          <Group title="Together">
            <div className="grid gap-5 md:grid-cols-3">
              {TOGETHER.map((d) => (
                <FeatureTile
                  key={d.href}
                  destination={d}
                  href={target(d.href)}
                />
              ))}
            </div>
          </Group>

          <Group title="Plan and remember">
            <div className="grid gap-3 sm:grid-cols-2">
              {PLAN_AND_REMEMBER.map((d) => (
                <ListLink key={d.href} destination={d} href={target(d.href)} />
              ))}
            </div>
          </Group>

          <Group title="People">
            <div className="grid gap-3 sm:grid-cols-2">
              {PEOPLE.map((d) => (
                <ListLink key={d.href} destination={d} href={target(d.href)} />
              ))}
            </div>
          </Group>

          <Group title="Your account">
            <div className="grid gap-3 sm:grid-cols-2">
              {ACCOUNT.map((d) => (
                <ListLink key={d.href} destination={d} href={target(d.href)} />
              ))}
            </div>
          </Group>
        </div>
      </main>
    </div>
  );
}

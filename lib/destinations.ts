import {
  Award,
  BookHeart,
  CalendarHeart,
  Camera,
  Gift,
  House,
  Images,
  Inbox,
  ListChecks,
  MailOpen,
  MessagesSquare,
  Plane,
  Settings,
  Sparkles,
  Timer,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  Mail,
  Heart,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

export type Destination = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

// The five tabs. Each has a hub page of tiles, and a list of the pages that
// belong to it so the right tab lights up.
export type Tab = Destination & { match: string[] };

export const PLAN: Destination[] = [
  { href: "/dates", title: "Dates", description: "Plans for the time you spend together.", icon: CalendarHeart },
  { href: "/visits", title: "Next visit", description: "Set the date you'll see each other next.", icon: Plane },
  { href: "/countdowns", title: "Countdowns", description: "Count down to trips, birthdays and big days.", icon: Timer },
  { href: "/surprises", title: "Surprises", description: "Schedule a message to unlock on a day you choose.", icon: Gift },
  { href: "/bucket-list", title: "Bucket list", description: "Things you want to do together.", icon: ListChecks },
  { href: "/letters", title: "Open when letters", description: "Sealed letters for just the right moment.", icon: MailOpen },
];

export const REMEMBER: Destination[] = [
  { href: "/us", title: "Our story", description: "Your days together, streak and mood.", icon: Heart },
  { href: "/memories", title: "Memories", description: "Moments you want to keep.", icon: Images },
  { href: "/photos", title: "Photo of the day", description: "One photo a day, from your world to theirs.", icon: Camera },
  { href: "/recap", title: "Your week", description: "A look back at how the last seven days went.", icon: Sparkles },
  { href: "/year", title: "Year in review", description: "Your year together, in numbers. Opens each November.", icon: Trophy },
  { href: "/checkins/view", title: "Check-in feed", description: "Read everything you've both shared.", icon: BookHeart },
];

export const FRIENDS: Destination[] = [
  { href: "/friends-list", title: "My friends", description: "See your friends and send a relationship request.", icon: Users },
  { href: "/friends", title: "Find friends", description: "Send a friend request to someone you know.", icon: UserPlus },
  { href: "/friend-requests", title: "Friend requests", description: "Accept requests from other people.", icon: Mail },
  { href: "/rewards", title: "Friend rewards", description: "Everything you've earned with your friends.", icon: Award },
  { href: "/community", title: "Community", description: "Share a short message with everyone here.", icon: MessagesSquare },
];

export const YOU: Destination[] = [
  { href: "/settings", title: "Settings", description: "Your name, password, relationship and sign out.", icon: Settings },
  { href: "/mailbox", title: "Mailbox", description: "Kind messages from your people, and a note from us.", icon: Inbox },
];

export const TABS: Tab[] = [
  {
    href: "/dashboard",
    title: "Today",
    description: "Your partner's check-in, your next visit and reminders.",
    icon: House,
    match: ["/dashboard", "/checkins", "/question"],
  },
  {
    href: "/plan",
    title: "Plan",
    description: "Dates, visits, countdowns and surprises.",
    icon: CalendarDays,
    match: ["/plan", ...PLAN.map((d) => d.href), "/countdowns"],
  },
  {
    href: "/remember",
    title: "Remember",
    description: "Memories, photos and your year together.",
    icon: Images,
    match: ["/remember", "/us", "/memories", "/photos", "/recap", "/year"],
  },
  {
    href: "/people",
    title: "Friends",
    description: "Your friends, requests and rewards.",
    icon: Users,
    match: ["/people", ...FRIENDS.map((d) => d.href)],
  },
  {
    href: "/you",
    title: "You",
    description: "Settings and your mailbox.",
    icon: UserRound,
    match: ["/you", "/settings", "/mailbox", "/relationship-requests"],
  },
];

// The tab a page belongs to, or null for pages outside the app.
export function tabFor(pathname: string): Tab | null {
  return (
    TABS.find((t) =>
      t.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
    ) ?? null
  );
}

// Links shown as a second row of tabs at the top of related pages.
export const SUB_TABS: { paths: string[]; items: { href: string; label: string }[] }[] = [
  {
    paths: ["/checkins", "/checkins/view", "/question"],
    items: [
      { href: "/checkins", label: "Check in" },
      { href: "/checkins/view", label: "Feed" },
      { href: "/question", label: "Question of the day" },
    ],
  },
  {
    paths: ["/friends-list", "/friends", "/friend-requests", "/rewards", "/community"],
    items: [
      { href: "/friends-list", label: "My friends" },
      { href: "/friends", label: "Find" },
      { href: "/friend-requests", label: "Requests" },
      { href: "/rewards", label: "Rewards" },
      { href: "/community", label: "Community" },
    ],
  },
];

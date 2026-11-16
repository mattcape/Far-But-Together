import {
  BookHeart,
  CalendarHeart,
  HeartHandshake,
  Images,
  MailOpen,
  MessageCircleQuestion,
  ListChecks,
  LayoutDashboard,
  Mail,
  Inbox,
  MessagesSquare,
  Plane,
  Settings,
  Smile,
  Sparkles,
  Camera,
  Timer,
  Gift,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Destination = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  soon?: boolean;
};

export const TOGETHER: Destination[] = [
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

export const PLAN_AND_REMEMBER: Destination[] = [
  {
    href: "/photos",
    title: "Photo of the day",
    description: "One photo a day, from your world to theirs.",
    icon: Camera,
  },
  {
    href: "/countdowns",
    title: "Countdowns",
    description: "Count down to trips, birthdays and big days.",
    icon: Timer,
  },
  {
    href: "/surprises",
    title: "Surprises",
    description: "Schedule a message to unlock on a day you choose.",
    icon: Gift,
  },
  {
    href: "/year",
    title: "Year in review",
    description: "Your year together, in numbers.",
    icon: Trophy,
  },
  {
    href: "/recap",
    title: "Your week",
    description: "A look back at how the last seven days went.",
    icon: Sparkles,
  },
  {
    href: "/dates",
    title: "Dates",
    description: "Plans for the time you spend together.",
    icon: CalendarHeart,
  },
  {
    href: "/letters",
    title: "Open when letters",
    description: "Sealed letters for just the right moment.",
    icon: MailOpen,
  },
  {
    href: "/question",
    title: "Question of the day",
    description: "One question for both of you, every day.",
    icon: MessageCircleQuestion,
  },
  {
    href: "/bucket-list",
    title: "Bucket list",
    description: "Things you want to do together.",
    icon: ListChecks,
  },
  {
    href: "/mailbox",
    title: "Mailbox",
    description: "Kind messages from your people, and a note from us.",
    icon: Inbox,
  },
  {
    href: "/memories",
    title: "Memories",
    description: "Moments you want to keep.",
    icon: Images,
  },
];

export const PEOPLE: Destination[] = [
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
    description: "Share a short message with everyone here.",
    icon: MessagesSquare,
  },
];

export const ACCOUNT: Destination[] = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Your countdown and your partner's latest check-in.",
    icon: LayoutDashboard,
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Change your name or password, or sign out.",
    icon: Settings,
  },
];

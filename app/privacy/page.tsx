import type { Metadata } from "next";
import LegalPage, { Contact, List, Section } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="Far But Together holds some of the most personal things two people share. Here is plainly what we keep, who can see it, and how you can remove it."
    >
      <Section title="What we collect">
        <p>When you use Far But Together we store:</p>
        <List
          items={[
            "Your account: your email address and a password. Your password is handled by our sign-in provider and stored in scrambled form. We never see it.",
            "Your profile: your display name, your time zone, and a friend code.",
            "What you add: daily check-ins (mood, how you feel, what you're grateful for), visit dates, planned dates, memories and their photos, bucket list items, your anniversary, messages and nudges, open when letters, question of the day answers, and community posts.",
            "Your connections: friend requests, friendships, relationship requests, and your relationship, plus any community posts you report.",
            "Technical records: like most websites, our hosting providers keep standard server logs, such as your IP address and browser type, to run and protect the service.",
          ]}
        />
        <p>
          We do not use advertising or analytics trackers, and we do not build
          profiles of you for any other purpose.
        </p>
      </Section>

      <Section title="Who can see what">
        <List
          items={[
            "Check-ins, visits, dates, memories, photos, your bucket list and your question answers are shared with your partner. They are not shown to other members.",
            "Messages are seen only by the people in that conversation. An open when letter is seen by its author, and by the person it is for once they open it.",
            "Photos are private. They are shown through short-lived links to you and your partner only.",
            "Your display name is visible to your friends, your partner, and people you have a pending request with. Someone who has your friend code can look up your display name. There is no public list of members.",
            "Community posts, and the display name of whoever wrote them, are visible to everyone who is signed in.",
            "Notes from \"the Far But Together team\" are automatic messages. A person does not read your account to write them.",
          ]}
        />
      </Section>

      <Section title="Who we share it with">
        <p>
          We do not sell your information and we do not share it for
          advertising. Two service providers store and run the site for us:
        </p>
        <List
          items={[
            "Supabase, which provides our database, sign-in, and photo storage.",
            "Vercel, which hosts the website.",
          ]}
        />
        <p>
          We may also disclose information if the law requires it, or to protect
          the safety of our members.
        </p>
      </Section>

      <Section title="How long we keep it, and deleting it">
        <p>
          We keep your information until you delete it. You are in control:
        </p>
        <List
          items={[
            "Delete individual memories, dates, bucket list items, letters and posts whenever you like.",
            "In Settings, choose End relationship to delete the shared visits, dates, memories, photos and bucket list for you and your partner.",
            "In Settings, choose Delete my account to permanently delete your account and everything in it.",
          ]}
        />
        <p>
          Backups kept by our providers may hold a copy for a short while after
          you delete something, and then expire.
        </p>
      </Section>

      <Section title="Cookies and storage on your device">
        <p>
          We store small pieces of information in your browser: your sign-in
          session, plus conveniences such as your theme, whether you have seen
          the welcome tour, and where you were on the homepage. We do not use
          advertising cookies.
        </p>
      </Section>

      <Section title="Keeping it safe">
        <p>
          Information travels over encrypted connections, and the database has
          rules so people can only reach what is meant for them. No system is
          perfectly secure, so please use a strong password that you do not use
          anywhere else.
        </p>
      </Section>

      <Section title="Age">
        <p>
          Far But Together is not for children under 13. If you believe a child
          has created an account, contact us and we will remove it.
        </p>
      </Section>

      <Section title="Changes and questions">
        <p>
          If we change this policy we will update the date at the top. To ask a
          question or request a copy or deletion of your information, contact{" "}
          <Contact />.
        </p>
      </Section>
    </LegalPage>
  );
}

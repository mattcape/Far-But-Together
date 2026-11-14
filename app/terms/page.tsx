import type { Metadata } from "next";
import LegalPage, { Contact, List, Section } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="The simple rules for using Far But Together. By creating an account or using the site, you agree to them."
    >
      <Section title="Using the site">
        <List
          items={[
            "You must be at least 13 years old.",
            "Give accurate information and keep your password to yourself. You are responsible for what happens on your account.",
            "Use the site for its purpose: staying close with the people you care about. Do not try to break it, overload it, or get into other people's accounts or data.",
          ]}
        />
      </Section>

      <Section title="Your content">
        <p>
          What you write, upload and share stays yours. You let us store it and
          show it to the people you choose, for example your partner, or the
          community when you post there, so the site can work.
        </p>
        <p>
          Only share things you have the right to share, and only photos and
          words that you are comfortable with the other person seeing.
        </p>
      </Section>

      <Section title="Being kind in the community">
        <p>The Community page is open to every member. Please do not post:</p>
        <List
          items={[
            "Harassment, threats, hate, or bullying of any kind.",
            "Sexual content, or anything that involves or endangers children.",
            "Other people's private information.",
            "Spam, scams, or anything illegal.",
          ]}
        />
        <p>
          Members can report posts. We may remove content or close accounts
          that break these rules.
        </p>
      </Section>

      <Section title="Not advice">
        <p>
          Far But Together is a tool for connection. It is not relationship
          counseling, medical advice, or mental health care. If you or someone
          you know is in danger or in crisis, contact local emergency services
          or a crisis line.
        </p>
      </Section>

      <Section title="The service as it is">
        <p>
          We work hard to keep the site running, but we provide it as is,
          without promises that it will always be available or error free.
          Features may change. Keep a copy of anything you could not bear to
          lose.
        </p>
        <p>
          To the fullest extent the law allows, we are not liable for indirect
          or incidental losses from using the site.
        </p>
      </Section>

      <Section title="Ending things">
        <p>
          You can stop using the site and delete your account at any time from
          Settings. We may suspend or close an account that breaks these terms
          or puts others at risk.
        </p>
      </Section>

      <Section title="Changes and questions">
        <p>
          If we change these terms we will update the date at the top. Using the
          site after a change means you accept it. Questions? Contact{" "}
          <Contact />.
        </p>
      </Section>
    </LegalPage>
  );
}

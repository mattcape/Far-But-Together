import type { ReactNode } from "react";
import PageFrame from "@/components/PageFrame";

export const UPDATED = "November 14, 2026";

// Where people can reach the site's owner. Set NEXT_PUBLIC_CONTACT_EMAIL in
// the hosting settings to show an email address here.
export function Contact() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return email ? (
    <a
      href={`mailto:${email}`}
      className="font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4"
    >
      {email}
    </a>
  ) : (
    <span>the site owner, using the contact details where you found this site</span>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <PageFrame title={title} subtitle={intro}>
      <p className="text-sm text-ink/70">Last updated {UPDATED}</p>
      {children}
    </PageFrame>
  );
}

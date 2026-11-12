import Link from "next/link";
import { CARD, FOCUS, SKY_BACKGROUND } from "@/lib/ui";

// The shared frame for login, register, and the profile page.
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center px-6 py-10"
      style={{ background: SKY_BACKGROUND }}
    >
      <Link href="/" className={`font-display text-2xl text-ink ${FOCUS}`}>
        Far But Together
      </Link>

      <div className={`mt-10 w-full max-w-md p-8 ${CARD}`}>
        <h1 className="font-display text-3xl text-ink">{title}</h1>

        {subtitle ? (
          <p className="mt-2 leading-relaxed text-ink/75">{subtitle}</p>
        ) : null}

        <div className="mt-6">{children}</div>
      </div>

      {footer ? <p className="mt-6 text-ink/80">{footer}</p> : null}
    </main>
  );
}

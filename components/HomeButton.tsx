import Link from "next/link";
import { FOCUS } from "@/lib/ui";

export default function HomeButton() {
  return (
    <Link
      href="/"
      className={`mb-6 inline-block rounded-full bg-white/85 px-4 py-2 font-semibold text-ink shadow hover:bg-white ${FOCUS}`}
    >
      ← Back to Home
    </Link>
  );
}

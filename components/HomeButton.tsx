import Link from "next/link";

export default function HomeButton() {
  return (
    <Link
      href="/dashboard"
      className="inline-block mb-6 bg-white text-rose-700 font-semibold px-4 py-2 rounded-full shadow hover:shadow-md transition"
    >
      ← Back to Home
    </Link>
  );
}

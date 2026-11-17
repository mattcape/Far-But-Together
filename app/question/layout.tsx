import type { Metadata } from "next";

export const metadata: Metadata = { title: "Question of the day" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

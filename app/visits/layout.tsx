import type { Metadata } from "next";

export const metadata: Metadata = { title: "Visits" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

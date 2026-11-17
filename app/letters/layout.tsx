import type { Metadata } from "next";

export const metadata: Metadata = { title: "Open when letters" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

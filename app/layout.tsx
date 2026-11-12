import type { Metadata } from "next";
import { Figtree, Fraunces, Young_Serif } from "next/font/google";
import AuthGuard from "@/components/AuthGuard";
import NavBar from "@/components/NavBar";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Far But Together",
    template: "%s | Far But Together",
  },
  description:
    "A shared space for couples who live apart: daily check-ins, visit countdowns, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${youngSerif.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}

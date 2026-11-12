import type { Metadata, Viewport } from "next";
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
  applicationName: "Far But Together",
  icons: { icon: "/pwa-icon/192", apple: "/pwa-icon/180" },
  appleWebApp: { capable: true, title: "Far But Together" },
  description:
    "A shared space for couples who live apart: daily check-ins, visit countdowns, and more.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#bfddf2" },
    { media: "(prefers-color-scheme: dark)", color: "#131937" },
  ],
};

// Runs before the page paints so a chosen theme doesn't flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem("fbt-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${youngSerif.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only rounded-full bg-white px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
        >
          Skip to content
        </a>
        <NavBar />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}

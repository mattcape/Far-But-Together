import HomeButton from "@/components/HomeButton";
import SubTabs from "@/components/SubTabs";
import { SKY_BACKGROUND } from "@/lib/ui";

// The shared frame for pages inside the app: sky background, a way back
// home, and a title.
export default function PageFrame({
  title,
  subtitle,
  children,
  width = "max-w-3xl",
  mobileSubtitle = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  mobileSubtitle?: boolean;
}) {
  return (
    <main
      id="main"
      className="min-h-screen px-5 py-5 sm:px-6 sm:py-10"
      style={{ background: SKY_BACKGROUND }}
    >
      <div className={`mx-auto ${width}`}>
        <HomeButton />

        <SubTabs />

        <h1 className="font-display text-3xl text-ink sm:text-5xl">{title}</h1>

        {subtitle ? (
          <p className={`mt-1 max-w-xl text-base leading-snug text-ink/80 sm:mt-3 sm:text-lg sm:leading-relaxed ${mobileSubtitle ? "" : "hidden sm:block"}`}>
            {subtitle}
          </p>
        ) : null}

        <div className="mt-4 sm:mt-8">{children}</div>
      </div>
    </main>
  );
}

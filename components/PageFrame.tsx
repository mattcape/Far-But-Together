import HomeButton from "@/components/HomeButton";
import { SKY_BACKGROUND } from "@/lib/ui";

// The shared frame for pages inside the app: sky background, a way back
// home, and a title.
export default function PageFrame({
  title,
  subtitle,
  children,
  width = "max-w-3xl",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <main
      id="main"
      className="min-h-screen px-6 py-10"
      style={{ background: SKY_BACKGROUND }}
    >
      <div className={`mx-auto ${width}`}>
        <HomeButton />

        <h1 className="font-display text-4xl text-ink sm:text-5xl">{title}</h1>

        {subtitle ? (
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink/80">
            {subtitle}
          </p>
        ) : null}

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

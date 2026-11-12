"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import CloudShape from "./CloudShape";

type Placement = {
  top: number; // % of screen height
  left: number; // % of screen width
  width: number; // vw
  dx: string; // where the cloud ends up horizontally
  dy: string; // and vertically
  delay: number; // seconds before this cloud starts to part
  tone: string;
};

const WHITE = "text-white";
const MIST = "text-[#e8f1f8]";

// Clouds on the left drift left, clouds on the right drift right, and the
// middle one lifts away last.
const CLOUDS: Placement[] = [
  { top: 2, left: -8, width: 52, dx: "-70vw", dy: "-6vh", delay: 1.6, tone: WHITE },
  { top: 0, left: 46, width: 56, dx: "70vw", dy: "-8vh", delay: 1.7, tone: MIST },
  { top: 20, left: 12, width: 46, dx: "-80vw", dy: "0vh", delay: 1.8, tone: MIST },
  { top: 18, left: 58, width: 50, dx: "80vw", dy: "0vh", delay: 1.75, tone: WHITE },
  { top: 36, left: -12, width: 58, dx: "-90vw", dy: "4vh", delay: 1.9, tone: WHITE },
  { top: 38, left: 50, width: 60, dx: "90vw", dy: "4vh", delay: 1.85, tone: MIST },
  { top: 56, left: 8, width: 52, dx: "-80vw", dy: "8vh", delay: 2.0, tone: MIST },
  { top: 58, left: 52, width: 54, dx: "80vw", dy: "8vh", delay: 2.05, tone: WHITE },
  { top: 74, left: -6, width: 60, dx: "-90vw", dy: "10vh", delay: 2.15, tone: WHITE },
  { top: 76, left: 44, width: 62, dx: "90vw", dy: "10vh", delay: 2.2, tone: MIST },
  { top: 27, left: 28, width: 44, dx: "0vw", dy: "-32vh", delay: 2.3, tone: WHITE },
];

const SEEN_KEY = "fbt-intro-seen";

function readSeen(): boolean {
  try {
    return !!sessionStorage.getItem(SEEN_KEY);
  } catch {
    return false;
  }
}

const noSubscription = () => () => {};

export default function CloudIntro() {
  // The intro plays once per visit. Coming back home from inside the app
  // skips it. The server always renders the intro; the browser corrects it.
  const seen = useSyncExternalStore(noSubscription, readSeen, () => false);
  const [dismissed, setDismissed] = useState(false);
  const done = seen || dismissed;

  function finish() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage can be blocked; the intro just plays again next time.
    }
    setDismissed(true);
  }

  if (done) return null;

  return (
    <div
      className="intro-overlay fixed inset-0 z-[60] overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #8fc1e6 0%, #cfe4f3 70%, #eef4f9 100%)",
      }}
      onAnimationEnd={(e) => {
        if (e.animationName === "intro-sky") finish();
      }}
    >
      <div aria-hidden="true">
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            className="intro-cloud absolute"
            style={
              {
                top: `${c.top}%`,
                left: `${c.left}%`,
                width: `${c.width}vw`,
                "--dx": c.dx,
                "--dy": c.dy,
                "--delay": `${c.delay}s`,
              } as CSSProperties
            }
          >
            <CloudShape className={c.tone} />
          </div>
        ))}
      </div>

      <p
        aria-hidden="true"
        className="intro-wordmark absolute inset-0 z-10 flex items-center justify-center px-6 text-center font-display text-4xl text-ink sm:text-6xl"
      >
        Far But Together
      </p>

      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Skip intro
      </button>
    </div>
  );
}

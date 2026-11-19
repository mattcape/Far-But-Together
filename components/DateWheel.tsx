"use client";

import Collapse from "@/components/Collapse";
import { useEffect, useRef, useState } from "react";
import { DATE_IDEAS, type DateIdea } from "@/lib/dateIdeas";
import { FOCUS, PRIMARY_BUTTON } from "@/lib/ui";

const SEGMENTS = 8;
const SIZE = 300;
const C = SIZE / 2;
const R = 140;
const SPIN_MS = 4200;

// Fills the wheel with up to four of your saved ideas, then built-in ones.
function makeOptions(saved: DateIdea[]): DateIdea[] {
  const shuffle = <T,>(items: T[]) =>
    [...items].sort(() => Math.random() - 0.5);

  const picked = shuffle(saved).slice(0, SEGMENTS / 2);
  const titles = new Set(picked.map((i) => i.title.toLowerCase()));
  const extra = shuffle(DATE_IDEAS).filter(
    (i) => !titles.has(i.title.toLowerCase())
  );

  return shuffle([...picked, ...extra.slice(0, SEGMENTS - picked.length)]);
}

function point(angle: number, radius: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;

  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)];
}

function wedge(index: number): string {
  const step = 360 / SEGMENTS;
  const [x1, y1] = point(index * step, R);
  const [x2, y2] = point((index + 1) * step, R);

  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
}

// Splits a title over up to three short lines so it fits inside its wedge.
function lines(title: string): string[] {
  const max = 14;
  const out: string[] = [""];

  for (const w of title.split(" ")) {
    const last = out.length - 1;

    if (!out[last] || `${out[last]} ${w}`.length <= max) {
      out[last] = out[last] ? `${out[last]} ${w}` : w;
    } else {
      out.push(w);
    }
  }

  if (out.length > 3) {
    const rest = out.slice(2).join(" ");

    return [out[0], out[1], rest.length > max ? `${rest.slice(0, max - 1).trimEnd()}…` : rest];
  }

  return out;
}

const FILLS = [
  { bg: "var(--rose-deep)", fg: "#ffffff" },
  { bg: "var(--blush)", fg: "#2a2342" },
];

export default function DateWheel({
  saved,
  onPlan,
}: {
  saved: DateIdea[];
  onPlan: (idea: DateIdea) => void;
}) {
  const [options, setOptions] = useState<DateIdea[]>(() => makeOptions(saved));
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [instant, setInstant] = useState(false);
  const [result, setResult] = useState<DateIdea | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  function spin() {
    if (spinning) return;

    const winner = Math.floor(Math.random() * SEGMENTS);
    const step = 360 / SEGMENTS;
    const center = winner * step + step / 2;
    const jitter = (Math.random() - 0.5) * step * 0.7;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Land the winning wedge under the pointer at the top, after a few turns.
    const current = ((angle % 360) + 360) % 360;
    const toTop = (((360 - center - jitter - current) % 360) + 360) % 360;

    setResult(null);
    setInstant(reduced);
    setAngle(angle + 360 * 5 + toTop);
    setSpinning(true);

    timer.current = window.setTimeout(
      () => {
        setSpinning(false);
        setResult(options[winner]);
      },
      reduced ? 0 : SPIN_MS + 100
    );
  }

  function reshuffle() {
    if (spinning) return;

    setResult(null);
    setOptions(makeOptions(saved));
  }

  const step = 360 / SEGMENTS;

  return (
    <Collapse title="Date night wheel">
      <p className="mt-1 text-ink/75">
        Can&apos;t decide? Spin it. Your saved ideas are on the wheel, plus a
        few of ours.
      </p>

      <div className="relative mx-auto mt-5 w-full max-w-[300px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className="block w-full overflow-hidden"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: instant
              ? "none"
              : `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.67, 0.1, 1)`,
          }}
        >
          {options.map((o, i) => {
            const fill = FILLS[i % FILLS.length];
            const mid = i * step + step / 2;
            const [tx, ty] = point(mid, R * 0.64);

            return (
              <g key={o.title}>
                <path d={wedge(i)} fill={fill.bg} stroke="var(--color-white)" strokeWidth="2" />
                <text
                  x={tx}
                  y={ty}
                  fill={fill.fg}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  transform={`rotate(${mid - 90} ${tx} ${ty})`}
                >
                  {lines(o.title).map((line, n, all) => (
                    <tspan
                      key={n}
                      x={tx}
                      y={ty + (n - (all.length - 1) / 2) * 11.5 + 3.5}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
          <circle cx={C} cy={C} r="16" fill="var(--color-white)" />
        </svg>

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1"
          style={{
            width: 0,
            height: 0,
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: "20px solid var(--ink)",
          }}
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className={PRIMARY_BUTTON}
        >
          {spinning ? "Spinning..." : result ? "Spin again" : "Spin the wheel"}
        </button>
        <button
          type="button"
          onClick={reshuffle}
          disabled={spinning}
          className={`rounded-full px-5 py-3 font-semibold text-ink/75 hover:bg-white disabled:opacity-50 ${FOCUS}`}
        >
          New wheel
        </button>
      </div>

      <div role="status" aria-live="polite">
        {result ? (
          <div className="mt-5 rounded-2xl bg-blush/70 p-5 ring-1 ring-rose-deep/30">
            <div className="text-sm font-semibold text-ink/75">
              Tonight&apos;s date
            </div>
            <div className="mt-1 font-display text-2xl text-ink">
              {result.title}
            </div>
            <p className="mt-1 text-ink/80">{result.notes}</p>
            <button
              type="button"
              onClick={() => onPlan(result)}
              className={`mt-3 rounded-full bg-rose-deep px-5 py-2 font-semibold text-white hover:brightness-110 ${FOCUS}`}
            >
              Plan it
            </button>
          </div>
        ) : null}
      </div>
    </Collapse>
  );
}

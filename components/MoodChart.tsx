// A simple line chart of daily mood (1-10) for you and your partner.

type Point = { day: number; mood: number };

export type MoodSeries = { name: string; points: Point[] };

const W = 640;
const H = 220;
const PAD = { left: 36, right: 12, top: 12, bottom: 28 };

export default function MoodChart({
  days,
  mine,
  theirs,
}: {
  days: number;
  mine: MoodSeries;
  theirs: MoodSeries | null;
}) {
  const x = (day: number) =>
    PAD.left + ((days - 1 - day) / (days - 1)) * (W - PAD.left - PAD.right);
  const y = (mood: number) =>
    PAD.top + ((10 - mood) / 9) * (H - PAD.top - PAD.bottom);

  const line = (points: Point[]) =>
    [...points]
      .sort((a, b) => b.day - a.day)
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day)} ${y(p.mood)}`)
      .join(" ");

  const series = [
    { s: mine, className: "text-rose-deep", dash: undefined, shape: "circle" },
    ...(theirs
      ? [{ s: theirs, className: "text-ink", dash: "6 4", shape: "square" }]
      : []),
  ];

  const summary = series
    .map(
      ({ s }) =>
        `${s.name}: ${s.points.length} check-in${s.points.length === 1 ? "" : "s"}`
    )
    .join("; ");

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Mood over the last ${days} days. ${summary}.`}
        className="h-auto w-full"
      >
        {[2, 4, 6, 8, 10].map((m) => (
          <g key={m}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(m)}
              y2={y(m)}
              className="stroke-ink/15"
            />
            <text
              x={PAD.left - 8}
              y={y(m) + 4}
              textAnchor="end"
              className="fill-ink/70"
              fontSize="11"
            >
              {m}
            </text>
          </g>
        ))}

        <text x={PAD.left} y={H - 8} className="fill-ink/70" fontSize="11">
          {days} days ago
        </text>
        <text
          x={W - PAD.right}
          y={H - 8}
          textAnchor="end"
          className="fill-ink/70"
          fontSize="11"
        >
          Today
        </text>

        {series.map(({ s, className, dash, shape }) => (
          <g key={s.name} className={className}>
            {s.points.length > 1 ? (
              <path
                d={line(s.points)}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={dash}
                strokeLinejoin="round"
              />
            ) : null}
            {s.points.map((p) =>
              shape === "circle" ? (
                <circle
                  key={p.day}
                  cx={x(p.day)}
                  cy={y(p.mood)}
                  r="4"
                  fill="currentColor"
                />
              ) : (
                <rect
                  key={p.day}
                  x={x(p.day) - 4}
                  y={y(p.mood) - 4}
                  width="8"
                  height="8"
                  fill="currentColor"
                />
              )
            )}
          </g>
        ))}
      </svg>

      <figcaption className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/80">
        <span className="flex items-center gap-2">
          <svg width="28" height="10" aria-hidden="true" className="text-rose-deep">
            <line x1="0" x2="28" y1="5" y2="5" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="14" cy="5" r="4" fill="currentColor" />
          </svg>
          {mine.name}
        </span>
        {theirs ? (
          <span className="flex items-center gap-2">
            <svg width="28" height="10" aria-hidden="true" className="text-ink">
              <line x1="0" x2="28" y1="5" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
              <rect x="10" y="1" width="8" height="8" fill="currentColor" />
            </svg>
            {theirs.name}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

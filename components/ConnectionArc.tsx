// Two lanterns joined by a line that draws itself once the clouds have parted.
// When you're signed in, each lantern is labeled with a name.
export default function ConnectionArc({
  leftName,
  rightName,
}: {
  leftName?: string | null;
  rightName?: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      {/* The labels are positioned against this box, which is exactly the
          size of the drawing, so they line up with the lanterns. */}
      <div className="relative">
        <svg
          viewBox="0 0 1000 200"
          className="block h-auto w-full"
          role="img"
          aria-label="Two people, connected across a distance"
        >
          <defs>
            <radialGradient id="lantern-halo-fill">
              <stop offset="0" stopColor="#f3b55c" stopOpacity="0.9" />
              <stop offset="1" stopColor="#f3b55c" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            className="arc-line"
            pathLength={1}
            d="M90 150 C 300 -20, 700 -20, 910 150"
            fill="none"
            stroke="#e8a23a"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle
            className="lantern-halo"
            cx="90"
            cy="150"
            r="34"
            fill="url(#lantern-halo-fill)"
          />
          <circle
            className="lantern-core"
            cx="90"
            cy="150"
            r="9"
            fill="#f3b55c"
          />

          <circle
            className="lantern-halo"
            cx="910"
            cy="150"
            r="34"
            fill="url(#lantern-halo-fill)"
          />
          <circle
            className="lantern-core"
            cx="910"
            cy="150"
            r="9"
            fill="#f3b55c"
          />
        </svg>

        {leftName ? (
          <p className="absolute left-[9%] top-[93%] max-w-[28vw] -translate-x-1/2 truncate text-sm font-semibold text-ink">
            {leftName}
          </p>
        ) : null}

        {rightName ? (
          <p className="absolute left-[91%] top-[93%] max-w-[28vw] -translate-x-1/2 truncate text-sm font-semibold text-ink">
            {rightName}
          </p>
        ) : null}
      </div>
    </div>
  );
}

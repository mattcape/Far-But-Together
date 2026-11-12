// A single soft cloud. It takes its color from the surrounding text color,
// so set it with a text-* class (for example "text-white").
export default function CloudShape({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="120" cy="84" rx="108" ry="24" />
      <circle cx="68" cy="66" r="32" />
      <circle cx="116" cy="46" r="42" />
      <circle cx="170" cy="64" r="34" />
    </svg>
  );
}

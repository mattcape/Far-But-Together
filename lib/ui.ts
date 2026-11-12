// Shared look-and-feel pieces so every page matches the homepage.

export const SKY_BACKGROUND =
  "linear-gradient(180deg, #bfddf2 0%, #eaf1f7 38%, #f9e6df 100%)";

export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export const CARD =
  "rounded-[28px] bg-white/90 shadow-[0_18px_40px_-22px_rgba(42,40,80,0.45)]";

export const INPUT = `w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-ink placeholder:text-ink/50 ${FOCUS}`;

export const PRIMARY_BUTTON = `rounded-full bg-rose-deep px-7 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60 ${FOCUS}`;

export const SECONDARY_BUTTON = `rounded-full bg-white/80 px-7 py-3 font-semibold text-ink ring-1 ring-ink/15 hover:bg-white disabled:opacity-60 ${FOCUS}`;

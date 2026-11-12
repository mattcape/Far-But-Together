"use client";

import { useEffect, useRef, useState } from "react";
import { FOCUS, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

const KEY = "fbt-tour-done";

const STEPS = [
  {
    title: "Welcome to Far But Together",
    body: "A shared space for the two of you. Here's a quick look at what you can do.",
  },
  {
    title: "Check in every day",
    body: "Share your mood and what you're grateful for. Your streak and your partner's latest check-in show up right here on your dashboard.",
  },
  {
    title: "Count down and plan",
    body: "Set your next visit to start a countdown, plan dates, keep a shared bucket list, and save memories with photos.",
  },
  {
    title: "Send a little love",
    body: "Tap Thinking of you for a quick nudge, or write a note from the Mailbox. We'll leave you a kind message every time you visit, too.",
  },
  {
    title: "Everything is on the homepage",
    body: "Use Back to Home from any page to find every tool. You're all set.",
  },
];

// A short first-visit walkthrough. Shown once per browser; reopen it from
// Settings is not needed because every step points at something visible.
export default function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let done = false;

    try {
      done = !!localStorage.getItem(KEY);
    } catch {
      // Storage blocked: skip the tour rather than show it every time.
      done = true;
    }

    const timer = window.setTimeout(() => {
      if (!done) setOpen(true);
    }, 600);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (open) primary.current?.focus();
  }, [open, step]);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Ignore.
    }
    setOpen(false);
  }

  if (!open) return null;

  const last = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-xl"
      >
        <p className="text-sm font-semibold text-rose-deep">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 font-display text-3xl text-ink">
          {STEPS[step].title}
        </h2>
        <p className="mt-3 leading-relaxed text-ink/80">{STEPS[step].body}</p>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={close}
            className={`rounded-full px-3 py-2 font-semibold text-ink/70 hover:text-ink ${FOCUS}`}
          >
            Skip
          </button>

          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className={SECONDARY_BUTTON}
              >
                Back
              </button>
            ) : null}
            <button
              ref={primary}
              type="button"
              onClick={() => (last ? close() : setStep(step + 1))}
              className={PRIMARY_BUTTON}
            >
              {last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

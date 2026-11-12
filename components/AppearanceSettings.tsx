"use client";

import { useSyncExternalStore } from "react";
import { CARD, FOCUS } from "@/lib/ui";

type Theme = "system" | "light" | "dark";

const THEME_KEY = "fbt-theme";
const NOTIFY_KEY = "fbt-notify";
const CHANGE = "fbt-settings-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE, callback);
  return () => window.removeEventListener(CHANGE, callback);
}

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "Match my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// Whether the site may show a browser notification for new messages.
export function notificationsOn(): boolean {
  return (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    read(NOTIFY_KEY) !== "off"
  );
}

export default function AppearanceSettings() {
  const theme = (useSyncExternalStore(
    subscribe,
    () => read(THEME_KEY) || "system",
    () => "system"
  ) || "system") as Theme;

  const notify = useSyncExternalStore(
    subscribe,
    () => {
      if (typeof Notification === "undefined") return "unsupported";
      if (Notification.permission === "denied") return "denied";
      return notificationsOn() ? "on" : "off";
    },
    () => "off"
  );

  function chooseTheme(value: Theme) {
    applyTheme(value);
    write(THEME_KEY, value === "system" ? null : value);
  }

  async function toggleNotify() {
    if (notify === "on") {
      write(NOTIFY_KEY, "off");
      return;
    }

    if (Notification.permission !== "granted") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        window.dispatchEvent(new Event(CHANGE));
        return;
      }
    }

    write(NOTIFY_KEY, null);
  }

  return (
    <>
      <section className={`${CARD} p-6`}>
        <h2 className="font-display text-2xl text-ink">Appearance</h2>

        <fieldset className="mt-3">
          <legend className="sr-only">Theme</legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <label
                key={t.value}
                className={`cursor-pointer rounded-full px-4 py-2 font-semibold ring-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                  theme === t.value
                    ? "bg-rose-deep text-white ring-transparent"
                    : "bg-white/80 text-ink ring-ink/15 hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.value}
                  checked={theme === t.value}
                  onChange={() => chooseTheme(t.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className={`${CARD} p-6`}>
        <h2 className="font-display text-2xl text-ink">Notifications</h2>

        {notify === "unsupported" ? (
          <p className="mt-2 text-ink/75">
            This browser doesn&apos;t support notifications.
          </p>
        ) : (
          <>
            <p className="mt-2 leading-relaxed text-ink/75">
              Get a pop-up when a new message arrives while Far But Together is
              open in a tab. The tab title also shows how many messages are
              unread.
            </p>

            {notify === "denied" ? (
              <p className="mt-3 font-semibold text-ink">
                Notifications are blocked for this site. Allow them in your
                browser&apos;s site settings to turn this on.
              </p>
            ) : (
              <button
                type="button"
                onClick={toggleNotify}
                aria-pressed={notify === "on"}
                className={`mt-4 rounded-full px-6 py-3 font-semibold ${FOCUS} ${
                  notify === "on"
                    ? "bg-white/80 text-ink ring-1 ring-ink/15 hover:bg-white"
                    : "bg-rose-deep text-white hover:brightness-110"
                }`}
              >
                {notify === "on"
                  ? "Turn notifications off"
                  : "Turn notifications on"}
              </button>
            )}
          </>
        )}
      </section>
    </>
  );
}

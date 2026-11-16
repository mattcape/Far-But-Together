// The browser's time zone, sent to functions that decide "today" for you.
export function myTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

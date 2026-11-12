// A short result message shown under a form or list (saved, failed...).
export default function StatusMessage({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "success" | "error";
}) {
  if (!message) return null;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
        tone === "error"
          ? "bg-blush text-rose-deep"
          : "bg-white text-ink ring-1 ring-ink/10"
      }`}
    >
      {message}
    </p>
  );
}

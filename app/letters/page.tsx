"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import StatusMessage from "@/components/StatusMessage";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingSetup } from "@/lib/relationship";
import { sendMessage } from "@/lib/messages";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type Letter = {
  id: string;
  author_id: string;
  recipient_id: string;
  occasion: string;
  created_at: string;
  opened_at: string | null;
  body: string | null;
};

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

const IDEAS = [
  "you miss me",
  "you can't sleep",
  "you've had a rough day",
  "you need a laugh",
  "you're feeling proud",
  "we've had a disagreement",
  "you're feeling anxious",
  "it's your birthday",
];

const OTHER = "__other";

export default function LettersPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [relationshipId, setRelationshipId] = useState<string | number | null>(
    null
  );
  const [letters, setLetters] = useState<Letter[]>([]);

  const [choice, setChoice] = useState(IDEAS[0]);
  const [custom, setCustom] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function fetchLetters(): Promise<{
    rows: Letter[];
    missing: boolean;
  }> {
    const { data, error } = await supabase.rpc("my_letters");

    if (isMissingSetup(error)) return { rows: [], missing: true };

    return { rows: (data ?? []) as Letter[], missing: false };
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const couple = await getCouple();

      if (cancelled) return;

      if (couple.status === "signed-out") {
        window.location.href = "/login";
        return;
      }

      if (couple.status === "none") {
        setView("no-relationship");
        return;
      }

      const { rows, missing } = await fetchLetters();

      if (cancelled) return;

      if (missing) {
        setView("needs-setup");
        return;
      }

      setUserId(couple.userId);
      setPartnerId(couple.partnerId);
      setPartnerName(couple.partnerName);
      setRelationshipId(couple.relationshipId);
      setLetters(rows);
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function write(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const occasion = (choice === OTHER ? custom : choice).trim();
    const text = body.trim();

    if (!occasion || !text) {
      setFailed(true);
      setMessage("Choose when to open it, and write your letter.");
      return;
    }

    if (relationshipId === null) return;

    setBusy(true);

    const { error } = await supabase.from("letters").insert({
      relationship_id: relationshipId,
      author_id: userId,
      recipient_id: partnerId,
      occasion,
      body: text,
    });

    if (error) {
      setBusy(false);
      setFailed(true);
      setMessage(error.message);
      return;
    }

    // Let them know there's a new letter waiting. The text stays sealed.
    await sendMessage(
      partnerId,
      "note",
      `I left you a letter. Open when ${occasion}.`
    );

    const { rows } = await fetchLetters();

    setBusy(false);
    setLetters(rows);
    setBody("");
    setCustom("");
    setFailed(false);
    setMessage(`Sealed. ${partnerName} will see it under "Letters for you".`);
  }

  async function open(letter: Letter) {
    const { data, error } = await supabase.rpc("open_letter", {
      p_id: letter.id,
    });

    if (error || typeof data !== "string") {
      setFailed(true);
      setMessage(error?.message ?? "Couldn't open that letter.");
      return;
    }

    setLetters((current) =>
      current.map((l) =>
        l.id === letter.id
          ? { ...l, body: data, opened_at: new Date().toISOString() }
          : l
      )
    );
  }

  async function remove(letter: Letter) {
    if (!window.confirm("Delete this letter? It will disappear for both of you."))
      return;

    const { error } = await supabase.from("letters").delete().eq("id", letter.id);

    if (error) {
      setFailed(true);
      setMessage(error.message);
      return;
    }

    setLetters((current) => current.filter((l) => l.id !== letter.id));
  }

  const forMe = letters.filter((l) => l.recipient_id === userId);
  const fromMe = letters.filter((l) => l.author_id === userId);
  const unopened = forMe.filter((l) => !l.opened_at).length;

  return (
    <PageFrame
      title="Open when letters"
      subtitle="Write letters your partner can open at just the right moment. Each one stays sealed until they choose to open it."
    >
      {view !== "ready" ? (
        <SharedPageState kind={view} sqlFile="letters-and-questions.sql" />
      ) : (
        <>
          <section>
            <h2 className="mb-4 font-display text-3xl text-ink">
              Letters for you
              {unopened > 0 ? (
                <span className="ml-3 rounded-full bg-rose-deep px-3 py-1 align-middle text-sm font-semibold text-white">
                  {unopened} sealed
                </span>
              ) : null}
            </h2>

            {forMe.length === 0 ? (
              <p className="text-ink/75">
                {`${partnerName} hasn't left you a letter yet.`}
              </p>
            ) : (
              <ul className="space-y-4">
                {forMe.map((l) => (
                  <li key={l.id} className={`${CARD} p-5`}>
                    <p className="font-display text-2xl text-ink">
                      Open when {l.occasion}
                    </p>

                    {l.opened_at && l.body ? (
                      <>
                        <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-ink">
                          {l.body}
                        </p>
                        <p className="mt-3 text-sm text-ink/65">
                          From {partnerName}. Opened{" "}
                          {formatDistanceToNow(new Date(l.opened_at), {
                            addSuffix: true,
                          })}
                          .
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-ink/75">
                          Sealed by {partnerName}. Open it when the time is
                          right.
                        </p>
                        <button
                          type="button"
                          onClick={() => open(l)}
                          className={`${PRIMARY_BUTTON} mt-4`}
                        >
                          Open this letter
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <form onSubmit={write} className={`${CARD} mt-12 p-6`}>
            <h2 className="font-display text-2xl text-ink">
              Write a letter for {partnerName}
            </h2>

            <label
              htmlFor="letter-when"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Open when…
            </label>
            <select
              id="letter-when"
              className={INPUT}
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
            >
              {IDEAS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
              <option value={OTHER}>Something else…</option>
            </select>

            {choice === OTHER ? (
              <input
                type="text"
                aria-label="When should they open it?"
                maxLength={80}
                placeholder="you finish your exams"
                className={`${INPUT} mt-3`}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            ) : null}

            <label
              htmlFor="letter-body"
              className="mb-1 mt-4 block font-semibold text-ink"
            >
              Your letter
            </label>
            <textarea
              id="letter-body"
              rows={6}
              maxLength={2000}
              className={INPUT}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            <button
              type="submit"
              disabled={busy}
              className={`${PRIMARY_BUTTON} mt-5`}
            >
              {busy ? "Sealing..." : "Seal and send"}
            </button>

            <StatusMessage message={message} tone={failed ? "error" : "success"} />
          </form>

          {fromMe.length > 0 ? (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-3xl text-ink">
                Letters you&apos;ve written
              </h2>

              <ul className="space-y-3">
                {fromMe.map((l) => (
                  <li key={l.id} className={`${CARD} p-5`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink">
                          Open when {l.occasion}
                        </p>
                        <p className="text-sm text-ink/70">
                          {l.opened_at
                            ? `Opened ${formatDistanceToNow(new Date(l.opened_at), { addSuffix: true })}`
                            : "Still sealed"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(l)}
                        aria-label={`Delete the letter for when ${l.occasion}`}
                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-ink/70 hover:bg-white hover:text-rose-deep ${FOCUS}`}
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-ink/80">{l.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}

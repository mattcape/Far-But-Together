"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import StatusMessage from "@/components/StatusMessage";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingSetup, parseDay } from "@/lib/relationship";
import { sendMessage } from "@/lib/messages";
import { questionDay, questionFor } from "@/lib/questions";
import { CARD, INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

type Answer = {
  id: string;
  user_id: string;
  question_day: string;
  question: string;
  answer: string;
};

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

const COLUMNS = "id, user_id, question_day, question, answer";

export default function QuestionPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [relationshipId, setRelationshipId] = useState<string | number | null>(
    null
  );
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  const today = questionDay();
  const question = questionFor(today);

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

      const { data, error } = await supabase
        .from("question_answers")
        .select(COLUMNS)
        .eq("relationship_id", couple.relationshipId)
        .order("question_day", { ascending: false })
        .limit(120);

      if (cancelled) return;

      if (isMissingSetup(error)) {
        setView("needs-setup");
        return;
      }

      setUserId(couple.userId);
      setPartnerId(couple.partnerId);
      setPartnerName(couple.partnerName);
      setRelationshipId(couple.relationshipId);
      setAnswers((data ?? []) as Answer[]);
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const mine = answers.find(
    (a) => a.question_day === today && a.user_id === userId
  );
  const theirs = answers.find(
    (a) => a.question_day === today && a.user_id === partnerId
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const text = draft.trim();

    if (!text) {
      setFailed(true);
      setMessage("Write your answer first.");
      return;
    }

    if (relationshipId === null) return;

    setBusy(true);

    const { data, error } = mine
      ? await supabase
          .from("question_answers")
          .update({ answer: text })
          .eq("id", mine.id)
          .select(COLUMNS)
          .single()
      : await supabase
          .from("question_answers")
          .insert({
            relationship_id: relationshipId,
            user_id: userId,
            question_day: today,
            question,
            answer: text,
          })
          .select(COLUMNS)
          .single();

    setBusy(false);

    if (error || !data) {
      setFailed(true);
      setMessage(error?.message ?? "Couldn't save your answer.");
      return;
    }

    // Answering unlocks your partner's answer, if they've given one.
    const { data: all } = await supabase
      .from("question_answers")
      .select(COLUMNS)
      .eq("relationship_id", relationshipId)
      .order("question_day", { ascending: false })
      .limit(120);

    setAnswers((all ?? [data]) as Answer[]);
    setEditing(false);
    setFailed(false);
    setMessage(mine ? "Answer updated." : "Answer saved.");
  }

  async function remind() {
    const problem = await sendMessage(
      partnerId,
      "note",
      "Today's question is waiting for you. I've answered!"
    );

    setFailed(!!problem);
    setMessage(problem ?? `Reminder sent to ${partnerName}.`);
  }

  // Earlier days, newest first, each with both answers.
  const pastDays = [
    ...new Set(
      answers.filter((a) => a.question_day !== today).map((a) => a.question_day)
    ),
  ];

  return (
    <PageFrame
      title="Question of the day"
      subtitle="One question for both of you each day. You see each other's answers once you've both shared yours."
    >
      {view !== "ready" ? (
        <SharedPageState kind={view} sqlFile="letters-and-questions.sql" />
      ) : (
        <>
          <section className={`${CARD} p-6 sm:p-8`}>
            <p className="font-display text-3xl leading-snug text-ink sm:text-4xl">
              {question}
            </p>

            {mine && !editing ? (
              <div className="mt-6">
                <p className="font-semibold text-ink">Your answer</p>
                <p className="mt-1 whitespace-pre-wrap text-ink/85">{mine.answer}</p>

                <button
                  type="button"
                  onClick={() => {
                    setDraft(mine.answer);
                    setEditing(true);
                  }}
                  className={`${SECONDARY_BUTTON} mt-3`}
                >
                  Edit my answer
                </button>

                <div className="mt-6 rounded-2xl bg-blush p-4">
                  <p className="font-semibold text-ink">{partnerName}&apos;s answer</p>

                  {theirs ? (
                    <p className="mt-1 whitespace-pre-wrap text-ink/90">
                      {theirs.answer}
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-ink/80">
                        Not here yet. You&apos;ll see it as soon as{" "}
                        {partnerName} answers.
                      </p>
                      <button
                        type="button"
                        onClick={remind}
                        className={`${SECONDARY_BUTTON} mt-3`}
                      >
                        Remind {partnerName}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6">
                <label
                  htmlFor="answer"
                  className="mb-1 block font-semibold text-ink"
                >
                  Your answer
                </label>
                <textarea
                  id="answer"
                  rows={4}
                  maxLength={1000}
                  className={INPUT}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />

                <p className="mt-2 text-sm text-ink/70">
                  {partnerName}&apos;s answer unlocks once you share yours.
                </p>

                <div className="mt-4 flex gap-3">
                  <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
                    {busy ? "Saving..." : editing ? "Save changes" : "Share my answer"}
                  </button>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className={SECONDARY_BUTTON}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            )}

            <StatusMessage message={message} tone={failed ? "error" : "success"} />
          </section>

          {pastDays.length > 0 ? (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-3xl text-ink">
                Earlier questions
              </h2>

              <ul className="space-y-4">
                {pastDays.map((day) => {
                  const onDay = answers.filter((a) => a.question_day === day);
                  const my = onDay.find((a) => a.user_id === userId);
                  const their = onDay.find((a) => a.user_id === partnerId);

                  return (
                    <li key={day} className={`${CARD} p-5`}>
                      <p className="text-sm text-ink/70">
                        {format(parseDay(day), "EEEE, MMMM d")}
                      </p>
                      <p className="mt-1 font-display text-xl text-ink">
                        {(my ?? their)?.question}
                      </p>

                      <p className="mt-3 font-semibold text-ink">You</p>
                      <p className="whitespace-pre-wrap text-ink/85">
                        {my ? my.answer : "No answer"}
                      </p>

                      <p className="mt-3 font-semibold text-ink">{partnerName}</p>
                      <p className="whitespace-pre-wrap text-ink/85">
                        {their
                          ? their.answer
                          : my
                            ? "No answer"
                            : "Hidden until you answer that day"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </PageFrame>
  );
}

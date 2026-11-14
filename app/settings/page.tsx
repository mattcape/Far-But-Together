"use client";

import { useEffect, useState, type FormEvent } from "react";
import PageFrame from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { saveDisplayName } from "@/lib/profile";
import AppearanceSettings from "@/components/AppearanceSettings";
import DeleteAccount from "@/components/DeleteAccount";
import RelationshipSettings from "@/components/RelationshipSettings";
import TimezoneSettings from "@/components/TimezoneSettings";
import { CARD, INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";

type Message = { kind: "ok" | "error"; text: string } | null;

function Notice({ message }: { message: Message }) {
  if (!message) return null;

  if (message.kind === "error") {
    return (
      <p role="alert" className="mt-3 text-sm font-semibold text-rose-deep">
        {message.text}
      </p>
    );
  }

  return (
    <p role="status" className="mt-3 text-sm font-semibold text-ink">
      {message.text}
    </p>
  );
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [nameMessage, setNameMessage] = useState<Message>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);

  const [busy, setBusy] = useState<"name" | "password" | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name ?? "");
    }

    load();
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameMessage(null);

    const name = displayName.trim();

    if (!name) {
      setNameMessage({
        kind: "error",
        text: "Enter the name you'd like your partner to see.",
      });
      return;
    }

    if (!userId) return;

    setBusy("name");
    const error = await saveDisplayName(userId, name);
    setBusy(null);

    if (error) {
      setNameMessage({ kind: "error", text: error });
      return;
    }

    setDisplayName(name);
    setNameMessage({ kind: "ok", text: "Name saved." });
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({
        kind: "error",
        text: "Use a password with at least 6 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        kind: "error",
        text: "The two passwords don't match.",
      });
      return;
    }

    setBusy("password");
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setBusy(null);

    if (error) {
      setPasswordMessage({ kind: "error", text: error.message });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage({ kind: "ok", text: "Password updated." });
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <PageFrame
      title="Settings"
      subtitle="Change how your name appears, update your password, or sign out."
    >
      <div className="space-y-6">
        <section className={`${CARD} p-6`}>
          <h2 className="font-display text-2xl text-ink">Your name</h2>

          <form onSubmit={saveName} className="mt-4">
            <label
              htmlFor="display-name"
              className="mb-1 block font-semibold text-ink"
            >
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              autoComplete="nickname"
              maxLength={40}
              className={INPUT}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <Notice message={nameMessage} />

            <button
              type="submit"
              disabled={busy === "name"}
              className={`${PRIMARY_BUTTON} mt-4`}
            >
              {busy === "name" ? "Saving..." : "Save name"}
            </button>
          </form>
        </section>

        <section className={`${CARD} p-6`}>
          <h2 className="font-display text-2xl text-ink">Password</h2>

          <form onSubmit={savePassword} className="mt-4">
            <label
              htmlFor="new-password"
              className="mb-1 block font-semibold text-ink"
            >
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={`${INPUT} mb-4`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label
              htmlFor="confirm-password"
              className="mb-1 block font-semibold text-ink"
            >
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={INPUT}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Notice message={passwordMessage} />

            <button
              type="submit"
              disabled={busy === "password"}
              className={`${PRIMARY_BUTTON} mt-4`}
            >
              {busy === "password" ? "Saving..." : "Update password"}
            </button>
          </form>
        </section>

        <TimezoneSettings />

        <AppearanceSettings />

        <RelationshipSettings />

        <DeleteAccount />

        <section className={`${CARD} p-6`}>
          <h2 className="font-display text-2xl text-ink">Sign out</h2>

          <p className="mt-2 text-ink/75">
            You&apos;re signed in as{" "}
            <span className="font-semibold text-ink">{email}</span>.
          </p>

          <button
            type="button"
            onClick={signOut}
            className={`${SECONDARY_BUTTON} mt-4`}
          >
            Sign out
          </button>
        </section>
      </div>
    </PageFrame>
  );
}

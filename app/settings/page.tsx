"use client";

import Collapse from "@/components/Collapse";
import { useEffect, useState, type FormEvent } from "react";
import PageFrame from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { saveDisplayName } from "@/lib/profile";
import AppearanceSettings from "@/components/AppearanceSettings";
import DataExport from "@/components/DataExport";
import DeleteAccount from "@/components/DeleteAccount";
import RelationshipSettings from "@/components/RelationshipSettings";
import TimezoneSettings from "@/components/TimezoneSettings";
import { INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/lib/ui";
import { getCurrentUser } from "@/lib/auth";

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
  const [savedName, setSavedName] = useState("");
  // null until we know; 1 or more means the one change has been used.
  const [nameChanges, setNameChanges] = useState<number | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);

  const [busy, setBusy] = useState<"name" | "password" | null>(null);

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const first = await supabase
        .from("profiles")
        .select("display_name, name_changes")
        .eq("id", user.id)
        .maybeSingle();

      let profile = first.data;

      // Before names-and-nicknames.sql has been run there is no counter yet.
      if (first.error) {
        const fallback = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        profile = fallback.data
          ? { ...fallback.data, name_changes: null as unknown as number }
          : null;
      }

      setDisplayName(profile?.display_name ?? "");
      setSavedName(profile?.display_name ?? "");
      setNameChanges(profile?.name_changes ?? null);
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

    if (name === savedName) {
      setNameMessage({ kind: "ok", text: "That's already your name." });
      return;
    }

    // Changing an existing name uses up the one change.
    const isChange = savedName !== "";

    if (
      isChange &&
      !window.confirm(
        `You can only change your name once. Change it to "${name}"?`
      )
    ) {
      return;
    }

    setBusy("name");
    const error = await saveDisplayName(userId, name);
    setBusy(null);

    if (error) {
      const used = /only change your name once/i.test(error);

      if (used) setNameChanges(1);

      setNameMessage({
        kind: "error",
        text: used ? "You've already used your one name change." : error,
      });
      return;
    }

    setDisplayName(name);
    setSavedName(name);

    if (isChange) setNameChanges((n) => (n ?? 0) + 1);

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
      <div className="space-y-2 sm:space-y-6">
        <Collapse title="Your name">

          {nameChanges !== null && nameChanges >= 1 && savedName ? (
            <div className="mt-4">
              <div className="font-semibold text-ink">Display name</div>
              <p className="mt-1 text-lg text-ink">{savedName}</p>
              <p className="mt-3 text-ink/75">
                You&apos;ve used your one name change, so your name is now
                locked.
                {process.env.NEXT_PUBLIC_CONTACT_EMAIL ? (
                  <>
                    {" "}
                    If something is wrong,{" "}
                    <a
                      href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
                      className="font-semibold text-ink underline decoration-rose-deep decoration-2 underline-offset-4"
                    >
                      contact us
                    </a>
                    .
                  </>
                ) : null}{" "}
                You can still give your friends nicknames any time from My
                friends.
              </p>
            </div>
          ) : (
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
              {nameChanges !== null && savedName ? (
                <p className="mt-2 text-sm text-ink/75">
                  You can change your name once. After that it&apos;s locked,
                  so choose carefully.
                </p>
              ) : null}

              <Notice message={nameMessage} />

              <button
                type="submit"
                disabled={busy === "name"}
                className={`${PRIMARY_BUTTON} mt-4`}
              >
                {busy === "name" ? "Saving..." : "Save name"}
              </button>
            </form>
          )}
        </Collapse>

        <Collapse title="Password">

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
        </Collapse>

        <TimezoneSettings />

        <AppearanceSettings />

        <RelationshipSettings />
        <DataExport />

        <DeleteAccount />

        <Collapse title="Sign out">

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
        </Collapse>
      </div>
    </PageFrame>
  );
}

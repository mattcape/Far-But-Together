"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format, subDays } from "date-fns";
import PageFrame from "@/components/PageFrame";
import SharedPageState from "@/components/SharedPageState";
import { supabase } from "@/lib/supabase";
import { getCouple, isMissingTable, parseDay } from "@/lib/relationship";
import { shrinkImage } from "@/lib/image";
import { CARD, FOCUS, INPUT, PRIMARY_BUTTON } from "@/lib/ui";

type Photo = {
  id: string;
  user_id: string;
  photo_day: string;
  photo_path: string;
  caption: string | null;
};

type View = "loading" | "no-relationship" | "needs-setup" | "ready";

const BUCKET = "memory-photos";
const COLUMNS = "id, user_id, photo_day, photo_path, caption";
const HISTORY_DAYS = 30;

async function signedUrls(rows: Photo[]): Promise<Record<string, string>> {
  const paths = rows.map((r) => r.photo_path);

  if (paths.length === 0) return {};

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 3600);

  const urls: Record<string, string> = {};

  for (const d of data ?? []) {
    if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  }

  return urls;
}

function Frame({
  urls,
  photo,
  label,
}: {
  urls: Record<string, string>;
  photo: Photo | undefined;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink/10">
      <div className="mb-2 font-semibold text-ink">{label}</div>
      {photo && urls[photo.photo_path] ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[photo.photo_path]}
            alt={photo.caption || `${label}'s photo of the day`}
            className="aspect-square w-full rounded-xl object-cover"
          />
          {photo.caption ? (
            <p className="mt-2 text-ink/85">{photo.caption}</p>
          ) : null}
        </>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-blush/50 px-4 text-center text-ink/75">
          Nothing yet today
        </div>
      )}
    </div>
  );
}

export default function PhotosPage() {
  const [view, setView] = useState<View>("loading");
  const [userId, setUserId] = useState("");
  const [partner, setPartner] = useState({ id: "", name: "" });
  const [relationshipId, setRelationshipId] = useState<string | number | null>(
    null,
  );
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

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

      const since = format(subDays(new Date(), HISTORY_DAYS), "yyyy-MM-dd");

      const { data, error: loadError } = await supabase
        .from("daily_photos")
        .select(COLUMNS)
        .eq("relationship_id", couple.relationshipId)
        .gte("photo_day", since)
        .order("photo_day", { ascending: false });

      if (cancelled) return;

      if (isMissingTable(loadError)) {
        setView("needs-setup");
        return;
      }

      const rows = (data ?? []) as Photo[];
      const links = await signedUrls(rows);

      if (cancelled) return;

      setUserId(couple.userId);
      setPartner({ id: couple.partnerId, name: couple.partnerName });
      setRelationshipId(couple.relationshipId);
      setPhotos(rows);
      setUrls(links);
      setView("ready");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const myToday = photos.find(
    (p) => p.user_id === userId && p.photo_day === today,
  );
  const theirToday = photos.find(
    (p) => p.user_id === partner.id && p.photo_day === today,
  );

  async function upload(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Choose a photo first.");
      return;
    }

    if (relationshipId === null) return;

    setBusy(true);

    try {
      const blob = await shrinkImage(file);
      const path = `${relationshipId}/daily/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg" });

      if (uploadError) throw new Error(uploadError.message);

      const { data, error: saveError } = await supabase
        .from("daily_photos")
        .upsert(
          {
            relationship_id: relationshipId,
            user_id: userId,
            photo_day: today,
            photo_path: path,
            caption: caption.trim() || null,
          },
          { onConflict: "relationship_id,user_id,photo_day" },
        )
        .select(COLUMNS)
        .single();

      if (saveError || !data) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(saveError?.message ?? "Couldn't save that photo.");
      }

      // A replaced photo's old file is no longer needed.
      if (myToday && myToday.photo_path !== path) {
        await supabase.storage.from(BUCKET).remove([myToday.photo_path]);
      }

      const links = await signedUrls([data as Photo]);

      setUrls((current) => ({ ...current, ...links }));
      setPhotos((current) =>
        [
          data as Photo,
          ...current.filter((p) => p.id !== (data as Photo).id),
        ].sort((a, b) => b.photo_day.localeCompare(a.photo_day)),
      );
      setFile(null);
      setFileKey((k) => k + 1);
      setCaption("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Couldn't upload that photo.",
      );
    }

    setBusy(false);
  }

  async function removeMine(photo: Photo) {
    if (!window.confirm("Remove this photo?")) return;

    const { error: deleteError } = await supabase
      .from("daily_photos")
      .delete()
      .eq("id", photo.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await supabase.storage.from(BUCKET).remove([photo.photo_path]);
    setPhotos((current) => current.filter((p) => p.id !== photo.id));
  }

  const earlier = photos.filter((p) => p.photo_day !== today);

  return (
    <PageFrame
      title="Photo of the day"
      subtitle="Share one photo a day, so you each see a little of the other's world."
    >
      {view !== "ready" ? (
        <SharedPageState kind={view} sqlFile="weekly-features.sql" />
      ) : (
        <>
          <section className={`${CARD} p-6`}>
            <h2 className="font-display text-2xl text-ink">Today</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Frame urls={urls} photo={myToday} label="You" />
              <Frame urls={urls} photo={theirToday} label={partner.name} />
            </div>

            <form onSubmit={upload} className="mt-6">
              <label
                htmlFor="dp-file"
                className="mb-1 block font-semibold text-ink"
              >
                {myToday ? "Replace your photo" : "Add your photo"}
              </label>
              <input
                key={fileKey}
                id="dp-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={`${INPUT} file:mr-4 file:rounded-full file:border-0 file:bg-blush file:px-4 file:py-1 file:font-semibold file:text-ink`}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              <label
                htmlFor="dp-caption"
                className="mb-1 mt-4 block font-semibold text-ink"
              >
                Caption (optional)
              </label>
              <input
                id="dp-caption"
                type="text"
                maxLength={140}
                className={INPUT}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />

              {error ? (
                <p
                  role="alert"
                  className="mt-3 text-sm font-semibold text-rose-deep"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className={PRIMARY_BUTTON}
                >
                  {busy
                    ? "Uploading..."
                    : myToday
                      ? "Replace photo"
                      : "Share photo"}
                </button>
                {myToday ? (
                  <button
                    type="button"
                    onClick={() => removeMine(myToday)}
                    className={`rounded-full px-5 py-3 font-semibold text-ink/75 hover:text-rose-deep ${FOCUS}`}
                  >
                    Remove today&apos;s photo
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <h2 className="mb-4 mt-12 font-display text-3xl text-ink">
            Earlier this month
          </h2>

          {earlier.length === 0 ? (
            <p className="text-ink/75">Past days will show up here.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {earlier.map((p) => (
                <li key={p.id} className={`${CARD} overflow-hidden`}>
                  {urls[p.photo_path] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urls[p.photo_path]}
                      alt={p.caption || "Photo of the day"}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : null}
                  <div className="p-3 text-sm text-ink/80">
                    <span className="font-semibold text-ink">
                      {p.user_id === userId ? "You" : partner.name}
                    </span>
                    , {format(parseDay(p.photo_day), "MMM d")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageFrame>
  );
}

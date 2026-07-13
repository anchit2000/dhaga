"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import {
  purgeCardPhotosAction,
  setStoreCardPhotosAction,
} from "@/lib/actions/settings";

function ToggleSubmit({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      role="switch"
      aria-checked={enabled}
      aria-label="Store card photos"
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
        enabled ? "border-amber/50 bg-amber/30" : "border-seam bg-wash/[0.06]"
      }`}
    >
      <span
        className={`absolute top-0.5 flex size-5.5 items-center justify-center rounded-full transition-all ${
          enabled ? "left-6 bg-amber" : "left-0.5 bg-fog/60"
        }`}
      >
        {pending ? <Loader2 className="size-3 animate-spin text-on-accent" /> : null}
      </span>
    </button>
  );
}

function PurgeSubmit({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-400/90 transition-colors hover:bg-red-400/10 disabled:pointer-events-none"
      onClick={(event) => {
        if (
          !confirm(
            `Delete all ${count} stored card photo${count === 1 ? "" : "s"}? Transcriptions (the text receipts) are kept. There is no undo.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      Delete all stored card photos
    </button>
  );
}

/** Store-card-photos preference + purge, per BRD privacy rules: storage is
 *  the user's call, and leaving it behind must always be one click. */
export function CardPhotoSetting({
  enabled,
  count,
}: {
  enabled: boolean;
  count: number;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <form
        action={setStoreCardPhotosAction}
        className="flex items-start justify-between gap-4"
      >
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <div>
          <p className="text-sm font-medium text-paper">Store card photos</p>
          <p className="mt-1 text-sm text-fog">
            Keep scanned card and badge photos in your database as visual
            receipts, shown on the person&apos;s page. Photos stay in your own
            storage — local, or your Postgres if you run in the cloud. When
            off, only the transcription is kept.
          </p>
        </div>
        <ToggleSubmit enabled={enabled} />
      </form>
      {count > 0 ? (
        <form action={purgeCardPhotosAction} className="border-t border-seam pt-4">
          <p className="mb-2 text-xs text-fog">
            {count} photo{count === 1 ? "" : "s"} stored right now.
          </p>
          <PurgeSubmit count={count} />
        </form>
      ) : null}
    </div>
  );
}

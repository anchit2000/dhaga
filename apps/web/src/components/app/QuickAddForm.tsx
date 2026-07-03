"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import {
  extractQuickAddAction,
  scanCardAction,
  type QuickAddState,
} from "@/lib/actions/quick-add";
import { Textarea } from "@/components/ui/textarea";
import { ContactForm } from "./ContactForm";
import { SessionPicker, type SessionOption } from "./SessionPicker";
import { SubmitButton } from "./SubmitButton";
import { downscalePhoto } from "./downscalePhoto";

type Mode = "paste" | "photo";

/** Capture (paste or card photo) → review-and-save with session attach. */
export function QuickAddForm({
  sessions,
  defaultSessionId,
  storeCardPhotos,
}: {
  sessions: SessionOption[];
  defaultSessionId?: string;
  storeCardPhotos: boolean;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const [state, formAction] = useActionState<QuickAddState, FormData>(
    async (previous, formData) => {
      const photo = formData.get("photo");
      if (photo instanceof File && photo.size > 0) {
        formData.set("photo", await downscalePhoto(photo));
        return scanCardAction(previous, formData);
      }
      return extractQuickAddAction(previous, formData);
    },
    {},
  );

  if (state.contact) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
            {state.via === "ai" ? "Extracted with AI" : "Parsed offline"}
          </span>
          <Link
            href="/app/quick-add"
            className="text-xs text-fog underline-offset-2 hover:text-paper hover:underline"
          >
            Start over
          </Link>
        </div>
        {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}
        <div className="rounded-2xl border border-seam bg-panel p-5 sm:p-6">
          <ContactForm initial={state.contact} submitLabel="Save person">
            <input type="hidden" name="source" value="quick_add" />
            <input type="hidden" name="sourceText" value={state.sourceText ?? ""} />
            <input type="hidden" name="imageBase64" value={state.imageBase64 ?? ""} />
            <input type="hidden" name="imageType" value={state.imageType ?? ""} />
            <SessionPicker sessions={sessions} defaultSessionId={defaultSessionId} />
          </ContactForm>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["paste", "photo"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              mode === option
                ? "border-amber/40 bg-amber/15 font-medium text-amber"
                : "border-seam text-fog hover:text-paper"
            }`}
          >
            {option === "paste" ? "Paste text" : "Card photo"}
          </button>
        ))}
      </div>

      {mode === "paste" ? (
        <form action={formAction} className="space-y-4">
          <Textarea
            name="raw"
            required
            rows={8}
            placeholder={
              "Paste anything with a person in it —\nan email signature, card text, a LinkedIn intro…"
            }
            className="font-mono text-sm"
          />
          <SubmitButton>Extract contact</SubmitButton>
        </form>
      ) : (
        <form action={formAction} className="space-y-4">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-seam bg-panel/40 p-6 text-center transition-colors hover:border-amber/40">
            <Camera className="size-6 text-amber" aria-hidden />
            <span className="text-sm text-paper">Take or choose a card photo</span>
            <span className="text-xs text-fog">
              {storeCardPhotos
                ? "Parsed by AI; the photo is kept in your database as the visual receipt (turn off in Settings)."
                : "Parsed by AI; the photo itself is not stored — only the transcription, as the receipt."}
            </span>
            <input
              type="file"
              name="photo"
              accept="image/*"
              capture="environment"
              required
              className="sr-only"
              onChange={(event) => {
                if (event.currentTarget.files?.length) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </label>
          <SubmitButton>Scan card</SubmitButton>
        </form>
      )}

      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}
    </div>
  );
}

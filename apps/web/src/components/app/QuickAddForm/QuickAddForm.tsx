"use client";

import { useActionState, useRef, useState } from "react";
import {
  extractQuickAddAction,
  attachCapturedNoteAction,
  scanCardAction,
  type QuickAddState,
} from "@/lib/actions/quick-add";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCropper } from "../PhotoCropper";
import type { EventOption } from "../EventPicker";
import { SubmitButton } from "../SubmitButton";
import { downscalePhoto } from "../downscalePhoto";
import { PhotoCaptureInput } from "./PhotoCaptureInput";
import { QuickAddDock } from "./QuickAddDock";
import { QuickAddResult } from "./QuickAddResult";

type Mode = "paste" | "photo";

/** Capture (paste, card photo, voice, or live webcam) → review-and-save with event attach. */
export function QuickAddForm({
  events,
  defaultEventId,
  storeCardPhotos,
  homeDock = false,
  aiUsage,
}: {
  events: EventOption[];
  defaultEventId?: string;
  storeCardPhotos: boolean;
  homeDock?: boolean;
  aiUsage?: string;
}) {
  const [mode, setMode] = useState<Mode>("paste");
  const [captureOpen, setCaptureOpen] = useState(!homeDock);
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
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
      <QuickAddResult
        contact={state.contact}
        via={state.via}
        notice={state.notice}
        sourceText={state.sourceText}
        imageBase64={state.imageBase64}
        imageType={state.imageType}
        events={events}
        defaultEventId={defaultEventId}
      />
    );
  }

  if (state.matches && state.matches.length > 1 && state.sourceText) {
    return (
      <section className="space-y-4 rounded-2xl border border-amber/30 bg-panel p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg">Which person did you mean?</h2>
          <p className="mt-1 text-sm text-fog">
            Several contacts match the name in this note. Choose one before Dhaga extracts relationships.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {state.matches.map((candidate) => (
            <form key={candidate.id} action={attachCapturedNoteAction}>
              <input type="hidden" name="contactId" value={candidate.id} />
              <input type="hidden" name="raw" value={state.sourceText} />
              <button className="w-full rounded-xl border border-seam p-3 text-left transition-colors hover:border-amber/40 hover:bg-amber/[0.05]">
                <span className="block text-sm font-medium text-paper">{candidate.name}</span>
                <span className="mt-0.5 block text-xs text-fog">
                  {[candidate.title, candidate.companyName].filter(Boolean).join(" · ") || "No title or company"}
                </span>
              </button>
            </form>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const formData = new FormData();
              formData.set("raw", state.sourceText ?? "");
              formData.set("skipDisambiguation", "true");
              formAction(formData);
            }}
            className="rounded-full border border-seam px-3 py-2 text-xs text-fog hover:text-paper"
          >
            None of these — create someone new
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full px-3 py-2 text-xs text-fog hover:text-paper"
          >
            Cancel
          </button>
        </div>
      </section>
    );
  }

  const captureForm = (
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
            ref={pasteTextareaRef}
            name="raw"
            required
            rows={8}
            placeholder={
              "Paste anything with a person in it —\nan email signature, card text, a LinkedIn intro… or tap Voice below and just talk."
            }
            className="font-mono text-sm"
          />
          <SubmitButton>Extract contact</SubmitButton>
        </form>
      ) : (
        <form action={formAction} className="space-y-4">
          <PhotoCaptureInput storeCardPhotos={storeCardPhotos} onPhotoSelected={setPhotoToCrop} />
          <SubmitButton>Scan card</SubmitButton>
        </form>
      )}

      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? <p className="text-sm text-fog">{state.notice}</p> : null}

      <QuickAddDock
        formAction={formAction}
        onVoiceStart={() => setMode("paste")}
        pasteTextareaRef={pasteTextareaRef}
        captureOpen={captureOpen}
        onCaptureToggle={homeDock ? () => setCaptureOpen((open) => !open) : undefined}
      />

      {photoToCrop ? (
        <PhotoCropper
          file={photoToCrop}
          onCancel={() => setPhotoToCrop(null)}
          onConfirm={(cropped) => {
            setPhotoToCrop(null);
            const formData = new FormData();
            formData.set("photo", cropped);
            formAction(formData);
          }}
        />
      ) : null}
    </div>
  );

  if (!homeDock) return <div className="pb-28">{captureForm}</div>;

  return (
    <div className="pb-28">
      {captureOpen ? (
        <section className="rounded-2xl border border-seam bg-panel p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="font-display text-lg">Capture someone</h2>
            <p className="mt-1 text-sm text-fog">Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt.</p>
            {aiUsage ? <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fog/60">{aiUsage}</p> : null}
          </div>
          {captureForm}
        </section>
      ) : (
        <QuickAddDock
          formAction={formAction}
          onVoiceStart={() => { setCaptureOpen(true); setMode("paste"); }}
          pasteTextareaRef={pasteTextareaRef}
          captureOpen={captureOpen}
          onCaptureToggle={() => setCaptureOpen(true)}
        />
      )}
    </div>
  );
}

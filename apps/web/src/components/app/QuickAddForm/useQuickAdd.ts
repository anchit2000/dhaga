"use client";

import { useActionState } from "react";
import {
  extractQuickAddAction,
  scanCardAction,
  type QuickAddState,
} from "@/lib/actions/quick-add";
import { downscalePhoto } from "../downscalePhoto";

/**
 * The capture action reducer: routes a submit to card-scan when it carries
 * `photo` files (downscaling each before upload) or to text extraction
 * otherwise. Pure plumbing, lifted out of QuickAddForm so the component stays
 * an orchestrator.
 */
export function useQuickAdd(): {
  state: QuickAddState;
  formAction: (formData: FormData) => void;
  pending: boolean;
} {
  const [state, formAction, pending] = useActionState<QuickAddState, FormData>(
    async (previous, formData) => {
      const photoFiles = formData
        .getAll("photo")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
      if (photoFiles.length > 0) {
        // Downscale each image before upload, then re-emit them all as `photo`
        // entries (the server reads getAll("photo") and merges them into one).
        const downscaled = await Promise.all(photoFiles.map((file) => downscalePhoto(file)));
        formData.delete("photo");
        for (const file of downscaled) formData.append("photo", file);
        return scanCardAction(previous, formData);
      }
      return extractQuickAddAction(previous, formData);
    },
    {},
  );
  return { state, formAction, pending };
}

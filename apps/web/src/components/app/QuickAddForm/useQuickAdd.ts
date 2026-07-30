"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import {
  extractQuickAddAction,
  scanCardAction,
  type QuickAddState,
} from "@/lib/actions/quick-add";
import { useBusyOverlay } from "@/components/app/BusyOverlay";
import { CARD_SCAN_MESSAGES, QUICK_ADD_MESSAGES } from "@/utils/constants/loader-messages";
import { downscalePhoto } from "../downscalePhoto";

/** True when this submit carries card images (vs. text to extract). */
function hasPhotos(formData: FormData): boolean {
  return formData.getAll("photo").some((entry) => entry instanceof File && entry.size > 0);
}

/**
 * The capture action reducer: routes a submit to card-scan when it carries
 * `photo` files (downscaling each before upload) or to text extraction
 * otherwise. Pure plumbing, lifted out of QuickAddForm so the component stays
 * an orchestrator.
 *
 * It also owns the blocking scan overlay, because this is the one choke point
 * every capture surface dispatches through. `showBusy` fires here as an urgent
 * update in the click handler rather than off `pending`: the Server Action
 * re-suspends home's `<Suspense><HomeDock/>` boundary for the whole call, and
 * nothing queued behind that transition — `pending` included — can commit while
 * it is suspended (see BusyOverlay). The hide runs off `pending` in an effect,
 * which lands as soon as the boundary resolves.
 */
export function useQuickAdd(): {
  state: QuickAddState;
  formAction: (formData: FormData) => void;
  pending: boolean;
} {
  const { showBusy, hideBusy } = useBusyOverlay();
  const [state, dispatch, pending] = useActionState<QuickAddState, FormData>(
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

  // The state object we dispatched FROM, while a submit is outstanding. The
  // overlay is cleared on result IDENTITY, not on `pending`: React destroys and
  // re-creates a hidden boundary's effects around the suspension, so an effect
  // keyed on `pending` (which cannot commit meanwhile, so it still reads false)
  // re-runs mid-scan and tears the overlay down early.
  const dispatchedFrom = useRef<QuickAddState | null>(null);

  useEffect(() => {
    if (dispatchedFrom.current !== null && state !== dispatchedFrom.current) {
      dispatchedFrom.current = null;
      hideBusy();
    }
  }, [state, hideBusy]);

  const formAction = useCallback(
    (formData: FormData): void => {
      dispatchedFrom.current = state;
      showBusy(hasPhotos(formData) ? CARD_SCAN_MESSAGES : QUICK_ADD_MESSAGES);
      dispatch(formData);
    },
    [dispatch, showBusy, state],
  );

  return { state, formAction, pending };
}

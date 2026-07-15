import type { DriveStep } from "driver.js";

/** Fired on `window` to (re)start the walkthrough on the already-mounted Home
 *  page — used by the "Take the tour" menu item when the user is already on /app. */
export const START_TOUR_EVENT = "dhaga:start-tour";

/** `/app?tour=1` deep-links into the walkthrough (menu item's target when the
 *  user is on another page and Home has to mount first). */
export const TOUR_QUERY_PARAM = "tour";

/**
 * The five first-run steps. Anchors resolve to elements that always render on
 * Home — even for a brand-new account with no data — so no step can miss its
 * target. driver.js auto-flips `side` when the preferred edge has no room.
 */
export const TOUR_STEPS: DriveStep[] = [
  {
    element: ".tour-quick-add",
    popover: {
      side: "top",
      align: "center",
      title: "Capture anyone",
      description:
        "Paste an intro, scan a card, or speak a note. Dhaga pulls out the details and threads them into your graph — and keeps the source as a receipt.",
    },
  },
  {
    element: '[data-tour="updates"]',
    popover: {
      side: "top",
      align: "start",
      title: "Your daily thread",
      description:
        "Who to reach out to, follow-ups coming due, and fresh signals about people you know — surfaced here so nothing slips.",
    },
  },
  {
    element: '[data-tour="search"]',
    popover: {
      side: "bottom",
      align: "center",
      title: "Ask in plain English",
      description:
        "Ask “who did I meet in Berlin last spring?” and search your whole network by memory, not just names.",
    },
  },
  {
    element: '[data-tour="graph"]',
    popover: {
      side: "bottom",
      align: "start",
      title: "See the whole web",
      description:
        "Explore your network visually — the people, companies, and connections behind every note.",
    },
  },
  {
    element: '[data-tour="more"]',
    popover: {
      side: "bottom",
      align: "end",
      title: "Take the tour anytime",
      description:
        "Replay this walkthrough whenever you like — it lives right here under the More menu.",
    },
  },
];

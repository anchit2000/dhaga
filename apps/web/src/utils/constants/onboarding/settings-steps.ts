import type { DriveStep } from "driver.js";

/**
 * A settings-leg step plus what it takes to make its anchor visible. The
 * settings tabs render every panel and only `hidden` the inactive ones, so an
 * anchor in another tab has no layout box: the tour sets `hash` (which is how
 * SettingsTabs already switches tab on a deep link) and then waits for
 * `selector` to be on screen before driving the step.
 */
export interface SettingsTourStep {
  /** Hash, without the `#`, that selects the tab owning this step's anchor. */
  hash: string;
  /** The anchor to wait for before this step drives. */
  selector: string;
  step: DriveStep;
}

/**
 * The tour's second leg, on /app/settings.
 *
 * Notifications come first and import is the finale: the reminder choice is a
 * preference the user can settle in one click while still in onboarding, while
 * importing is the "now go do this" call to action that reads better last (and
 * ends the tour on the same note it always did).
 *
 * Nothing here enables anything. Every email preference in Dhaga ships off, and
 * this step exists to surface that choice, not to make it — a pre-flipped switch
 * would defeat the whole point.
 */
export const SETTINGS_TOUR_STEPS: SettingsTourStep[] = [
  {
    hash: "suggestions",
    selector: '[data-tour="notifications"]',
    step: {
      element: '[data-tour="notifications"]',
      // The one step the user is meant to act on, so the overlay lets clicks
      // through to the switch instead of blocking them like every other step.
      disableActiveInteraction: false,
      popover: {
        side: "top",
        align: "center",
        title: "Decide what gets emailed",
        description:
          "Dhaga emails you nothing until you ask. Switch on a heads-up before a saved birthday or anniversary here — the daily digest and follow-up nudges just above work the same way. Leave them off and nothing is sent.",
      },
    },
  },
  {
    hash: "import",
    selector: '[data-tour="import"]',
    step: {
      element: '[data-tour="import"]',
      popover: {
        side: "top",
        align: "center",
        title: "Bring in your contacts",
        description:
          "Already have a network? Import it from LinkedIn, Google, Apple, or a CSV — start with LinkedIn and we'll remind you the moment your export is ready.",
      },
    },
  },
];

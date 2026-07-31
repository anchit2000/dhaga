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
 * Appearance opens, notifications follow, import is the finale: picking a theme
 * is the lightest thing a new user can do and costs them nothing, the reminder
 * choice is a preference they can settle in one click while still in onboarding,
 * and importing is the "now go do this" call to action that reads better last
 * (and ends the tour on the same note it always did).
 *
 * Nothing here enables anything. Every email preference in Dhaga ships off, and
 * that step exists to surface the choice, not to make it — a pre-flipped switch
 * would defeat the whole point.
 */
export const SETTINGS_TOUR_STEPS: SettingsTourStep[] = [
  {
    hash: "appearance",
    selector: '[data-tour="appearance"]',
    step: {
      element: '[data-tour="appearance"]',
      // Same reasoning as the notifications step below: this one is meant to be
      // played with, so the overlay lets clicks through to the theme picker.
      disableActiveInteraction: false,
      popover: {
        side: "bottom",
        align: "center",
        title: "Make it yours",
        description:
          "Pick a colour theme and a font for the app. It changes what you see in Dhaga and nothing else — the website, docs and blog stay as they are. Light and dark is still the toggle in the top bar, and every theme here works in both.",
      },
    },
  },
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

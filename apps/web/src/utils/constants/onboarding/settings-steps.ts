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
 * Appearance opens and import is the finale. Picking a theme is the lightest
 * thing a new user can do and costs them nothing, so it earns the first slot;
 * the reminder choice is a preference they can settle in one click while still
 * in onboarding; and importing is the "now go do this" call to action that reads
 * better last (and ends the tour on the same note it always did). The middle
 * runs credits, then contact sync: credits answer a question the AI steps have
 * just raised, rather than leaving a new user to meet the answer as a cap
 * message, and contact sync lands immediately before import so the two
 * directions read in order — what Dhaga sends out, then what you bring in.
 * Neither displaces a bookend.
 *
 * Nothing here enables anything — these steps surface choices rather than make
 * them. Note the two are no longer the same choice: since 2026-08-08 a new
 * account is created with its email reminders already on (seedEmailPreferences),
 * so the notifications step is showing the user where to switch things OFF,
 * while contact sync out to an address book still ships off and stays off until
 * they turn it on. Appearance is the one exception in kind rather than degree:
 * it writes a preference the moment you click a swatch, but it only changes
 * what you see and is one button from being undone.
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
          "Your reminders start switched on: a heads-up before a saved birthday or anniversary here, and the daily digest and follow-up nudges just above. This is the one place that decides what leaves the app — switch off anything you don't want and nothing is sent.",
      },
    },
  },
  {
    // The user has just been told AI does the reading, so this is the moment
    // "and here is what that costs you" answers a question they already have —
    // before the import step sends them off to do something.
    hash: "credits",
    selector: '[data-tour="credits"]',
    step: {
      element: '[data-tour="credits"]',
      popover: {
        side: "bottom",
        align: "center",
        title: "Know what the AI costs you",
        description:
          "Every AI action spends credits — a card scan is one, deep research is more. This tab shows what's left this month and exactly where the rest went, action by action.",
      },
    },
  },
  {
    hash: "capture",
    selector: '[data-tour="contact-sync"]',
    step: {
      element: '[data-tour="contact-sync"]',
      // Overlay stays blocking (BASE_CONFIG's disableActiveInteraction), unlike
      // the notifications step. Nothing here is a one-click preference: the
      // switch this names is not even rendered until an account is connected,
      // so the only live controls on the card are "Connect Google/Outlook" —
      // which leaves for a consent screen and destroys the tour — and a file
      // download. And a contact written into an address book reaches every
      // device signed into it and can never be pulled back, which is not a
      // decision to take under the momentum of a walkthrough.
      popover: {
        side: "top",
        align: "center",
        title: "Contacts can go back out",
        description:
          "Nothing in Dhaga reaches an address book unless you ask. Add Dhaga-only people — on a Google or Outlook account you connect here, or on the phone app's sync screen — is off until you turn it on, and turning it on copies the people you added in Dhaga across.",
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

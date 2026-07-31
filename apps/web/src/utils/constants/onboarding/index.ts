/** Onboarding-tour wiring. Split by leg (the step arrays are prose-heavy); this
 *  barrel keeps `@/utils/constants/onboarding` as the one import path. */

export { HOME_TOUR_STEPS } from "./home-steps";
export { SETTINGS_TOUR_STEPS, type SettingsTourStep } from "./settings-steps";

/** Fired on `window` to (re)start the walkthrough on the already-mounted Home
 *  page — used by the "Take the tour" menu item when the user is already on /app. */
export const START_TOUR_EVENT = "dhaga:start-tour";

/** `/app?tour=1` deep-links into the walkthrough (menu item's target when the
 *  user is on another page and Home has to mount first). */
export const TOUR_QUERY_PARAM = "tour";

/** Where the Home tour's finale sends the user to continue onto the settings
 *  leg. The hash must be the FIRST settings step's own hash (`#appearance` →
 *  the Account tab): the leg re-points the hash per step anyway, so any other
 *  value just flashes the wrong tab on arrival before it corrects itself. */
export const SETTINGS_TOUR_PATH = "/app/settings#appearance";

/** sessionStorage key set as the Home tour navigates to the settings page, read
 *  back by OnboardingTour on that page to resume the tour there. */
export const TOUR_RESUME_KEY = "dhaga:tour-resume";

/** The one value {@link TOUR_RESUME_KEY} takes — resume on the settings leg. */
export const TOUR_RESUME_SETTINGS = "settings";

/**
 * How many animation frames the settings leg waits for a step's anchor to become
 * visible before bailing loudly (~5s at 60fps). Generous on purpose: an anchor
 * can be behind both a tab switch and a per-card <Suspense> boundary fed by DB
 * reads, so a short budget would abandon the tour on a cold connection.
 */
export const TOUR_ANCHOR_WAIT_FRAMES = 300;

import { driver, type Config, type Driver } from "driver.js";
import { SETTINGS_TOUR_STEPS, TOUR_ANCHOR_WAIT_FRAMES } from "@/utils/constants/onboarding";

/**
 * Drives the tour's second leg on /app/settings (notification preferences, then
 * contact sync, then import) and returns its teardown.
 *
 * It lives outside OnboardingTour because the leg is a small state machine: each
 * step's anchor sits in a different settings tab, and the tabs render every panel
 * with the inactive ones `hidden`, so an off-tab anchor has no layout box. Between
 * steps the leg re-points the URL hash — the same deep-link channel SettingsTabs
 * already listens to — and waits for the anchor to be on screen before moving the
 * popover. No second hand-off channel.
 */
export function startSettingsTourLeg({
  baseConfig,
  onFinished,
}: {
  baseConfig: Config;
  onFinished: () => void;
}): () => void {
  let instance: Driver | null = null;
  let rafId = 0;

  /** Wait for `selector` to exist AND be visible, then run `onReady` — never
   *  drive a popover onto a zero-size box; bail loudly instead. */
  const waitForAnchor = (selector: string, onReady: () => void): void => {
    let frames = 0;
    const tick = (): void => {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement && el.offsetParent !== null) {
        onReady();
        return;
      }
      frames += 1;
      if (frames > TOUR_ANCHOR_WAIT_FRAMES) {
        console.warn(`[OnboardingTour] settings tour anchor never became visible: ${selector}`);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  };

  /** Select the tab owning step `index`, then run `move` once it is on screen. */
  const revealStep = (index: number, move: () => void): void => {
    const target = SETTINGS_TOUR_STEPS[index];
    if (!target) return;
    // Assignment, not replaceState: only a real hash change fires `hashchange`,
    // and that event is what makes SettingsTabs switch tab.
    if (window.location.hash.slice(1) !== target.hash) {
      window.location.hash = target.hash;
    }
    waitForAnchor(target.selector, move);
  };

  const stepTo = (index: number): void => {
    revealStep(index, () => instance?.moveTo(index));
  };

  const start = (): void => {
    if (instance) return;
    let finished = false;
    instance = driver({
      ...baseConfig,
      steps: SETTINGS_TOUR_STEPS.map((entry) => entry.step),
      doneBtnText: "Done",
      // Both handlers are overridden, so every move goes through revealStep and
      // no step can drive before its tab is the visible one.
      onNextClick: (_element, _step, { driver: active }) => {
        if (active.isLastStep()) {
          active.destroy(); // "Done" — onDestroyed marks the tour seen.
          return;
        }
        stepTo((active.getActiveIndex() ?? 0) + 1);
      },
      onPrevClick: (_element, _step, { driver: active }) => {
        const previous = (active.getActiveIndex() ?? 0) - 1;
        if (previous >= 0) stepTo(previous);
      },
      onDestroyed: () => {
        if (finished) return;
        finished = true;
        onFinished();
      },
    });
    instance.drive();
  };

  revealStep(0, start);

  return () => {
    cancelAnimationFrame(rafId);
    instance?.destroy();
    instance = null;
  };
}

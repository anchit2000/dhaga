"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { markOnboardingTourSeenAction } from "@/lib/actions/settings";
import {
  HOME_TOUR_STEPS,
  IMPORT_TOUR_PATH,
  IMPORT_TOUR_STEPS,
  START_TOUR_EVENT,
  TOUR_QUERY_PARAM,
  TOUR_RESUME_IMPORT,
  TOUR_RESUME_KEY,
} from "@/utils/constants/onboarding";
import "./onboarding-tour.css";

/** driver.js chrome shared by both legs of the tour (Home + import). */
const BASE_CONFIG = {
  showProgress: true,
  smoothScroll: true,
  overlayOpacity: 0.6,
  stagePadding: 6,
  stageRadius: 12,
  disableActiveInteraction: true,
  popoverClass: "dhaga-tour",
  nextBtnText: "Next",
  prevBtnText: "Back",
} as const;

/**
 * First-run product walkthrough (driver.js), mounted on BOTH Home and the
 * settings page so the tour can span pages. On Home it auto-starts once
 * (`autoStart`), replays via START_TOUR_EVENT / `/app?tour=1`, and its finale
 * navigates to the import page — where this same component (resume mode) picks
 * the tour up for its last step. Marks the tour seen only on a real
 * finish/skip/ESC, never on the hand-off nav. Renders nothing.
 */
export function OnboardingTour({ autoStart }: { autoStart: boolean }): null {
  const driverRef = useRef<Driver | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // RESUME MODE — settings page: continue onto the import step if handed off.
    if (pathname.startsWith("/app/settings")) {
      if (sessionStorage.getItem(TOUR_RESUME_KEY) !== TOUR_RESUME_IMPORT) {
        return;
      }
      sessionStorage.removeItem(TOUR_RESUME_KEY);

      const startImport = (): void => {
        if (driverRef.current?.isActive()) return;
        let marked = false;
        const instance = driver({
          ...BASE_CONFIG,
          steps: IMPORT_TOUR_STEPS,
          doneBtnText: "Done",
          onDestroyed: () => {
            if (marked) return;
            marked = true;
            void markOnboardingTourSeenAction();
          },
        });
        driverRef.current = instance;
        instance.drive();
      };

      // The `#import` hash selects the Import tab on mount, so the anchor is
      // briefly hidden — wait for it to exist AND be visible, then bail loudly.
      let rafId = 0;
      let frames = 0;
      const waitForAnchor = (): void => {
        const el = document.querySelector('[data-tour="import"]');
        if (el instanceof HTMLElement && el.offsetParent !== null) {
          startImport();
          return;
        }
        frames += 1;
        if (frames > 90) {
          console.warn(
            "[OnboardingTour] import tour anchor never became visible",
          );
          return;
        }
        rafId = requestAnimationFrame(waitForAnchor);
      };
      rafId = requestAnimationFrame(waitForAnchor);

      return () => {
        cancelAnimationFrame(rafId);
        driverRef.current?.destroy();
        driverRef.current = null;
      };
    }

    // HOME MODE — /app: original first-run behavior, but its last step hands off.
    const start = (): void => {
      if (driverRef.current?.isActive()) return;
      let marked = false;
      let navigating = false;
      const instance = driver({
        ...BASE_CONFIG,
        steps: HOME_TOUR_STEPS,
        // Last Home step reads "Next" — it hands off to the import page.
        doneBtnText: "Next",
        onNextClick: (_el, _step, { driver }) => {
          if (driver.isLastStep()) {
            navigating = true;
            try {
              sessionStorage.setItem(TOUR_RESUME_KEY, TOUR_RESUME_IMPORT);
            } catch {}
            driver.destroy();
            router.push(IMPORT_TOUR_PATH);
          } else {
            driver.moveNext();
          }
        },
        onDestroyed: () => {
          // Finish/skip/ESC only — the `navigating` guard skips the hand-off nav.
          if (marked || navigating) return;
          marked = true;
          void markOnboardingTourSeenAction();
        },
      });
      driverRef.current = instance;
      instance.drive();
    };

    // Deep-link (`/app?tour=1`): start, then strip the param so refresh won't replay.
    const deepLinked =
      new URLSearchParams(window.location.search).get(TOUR_QUERY_PARAM) === "1";
    if (deepLinked) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    window.addEventListener(START_TOUR_EVENT, start);
    if (autoStart || deepLinked) start();

    return () => {
      window.removeEventListener(START_TOUR_EVENT, start);
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [autoStart, pathname, router]);

  return null;
}

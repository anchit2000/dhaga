"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { StitchLoader } from "@/components/brand/StitchLoader";

interface NavigateOptions {
  replace?: boolean;
}

interface NavigationFeedbackValue {
  pendingHref?: string;
  /** Programmatic navigation (router.push/replace) that also shows the top bar. */
  navigate: (href: string, options?: NavigateOptions) => void;
}

interface PendingNavigation {
  fromPathname: string;
  href: string;
}

const NavigationFeedbackContext = createContext<NavigationFeedbackValue>({
  navigate: () => {},
});

export function useNavigationFeedback(): NavigationFeedbackValue {
  return useContext(NavigationFeedbackContext);
}

/** One app-shell boundary that gives every internal link immediate feedback. */
export function NavigationFeedback({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>();
  const pendingHref = pendingNavigation?.fromPathname === pathname
    ? pendingNavigation.href
    : undefined;

  const navigate = useCallback(
    (href: string, options?: NavigateOptions): void => {
      setPendingNavigation({ fromPathname: pathname, href });
      startTransition(() => {
        if (options?.replace) router.replace(href);
        else router.push(href);
      });
    },
    [pathname, router],
  );

  function handleClick(event: React.MouseEvent<HTMLDivElement>): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const destination = new URL(anchor.href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      (destination.pathname === pathname && destination.search === window.location.search)
    ) return;

    setPendingNavigation({
      fromPathname: pathname,
      href: `${destination.pathname}${destination.search}`,
    });
  }

  return (
    <NavigationFeedbackContext value={{ pendingHref, navigate }}>
      <div onClickCapture={handleClick} aria-busy={pendingHref !== undefined}>
        {pendingHref ? (
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex h-1 items-center overflow-hidden bg-amber/10">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-amber/70 to-transparent" />
            <StitchLoader className="absolute left-1/2 -translate-x-1/2" label="Loading page" />
          </div>
        ) : null}
        {children}
      </div>
    </NavigationFeedbackContext>
  );
}

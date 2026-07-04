"use client";

import { useEffect, useState, type RefObject } from "react";

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

interface BreakpointValues {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}

/** Resolves `value` to a per-breakpoint override once `responsive` is enabled. */
export function useResponsiveDimension(
  responsive: boolean,
  value: string | undefined,
  breakpoints: BreakpointValues,
): string | undefined {
  const [resolved, setResolved] = useState(value);

  useEffect(() => {
    if (!responsive) return;
    const calc = () => {
      const w = window.innerWidth;
      if (w <= 480 && breakpoints.mobile) setResolved(breakpoints.mobile);
      else if (w <= 768 && breakpoints.tablet) setResolved(breakpoints.tablet);
      else if (w <= 1024 && breakpoints.desktop) setResolved(breakpoints.desktop);
      else setResolved(value);
    };
    const debounced = debounce(calc, 100);
    calc();
    window.addEventListener("resize", debounced);
    return () => window.removeEventListener("resize", debounced);
  }, [responsive, value, breakpoints]);

  return responsive ? resolved : value;
}

/** True once the element has scrolled into view; true immediately when not gated on scroll. */
export function useIntersectionObserver(ref: RefObject<HTMLElement | null>, shouldObserve: boolean): boolean {
  const [isVisible, setIsVisible] = useState(!shouldObserve);

  useEffect(() => {
    if (!shouldObserve || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, shouldObserve]);

  return isVisible;
}

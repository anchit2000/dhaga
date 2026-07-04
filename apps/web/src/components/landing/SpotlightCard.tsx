"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

/**
 * Wraps a card with a soft amber spotlight that follows the cursor on
 * hover. When `idleGlow` is set, the card also pulses gently while
 * untouched, so it reads as featured even before anyone hovers it.
 * `className` carries the card's own visual styling (border, radius,
 * padding, background) so the spotlight overlay clips to the same shape.
 */
export function SpotlightCard({
  children,
  className = "",
  idleGlow = false,
}: {
  children: ReactNode;
  className?: string;
  idleGlow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const spot = spotRef.current;
      if (!el || !spot) return;
      if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
      if (matchMedia("(hover: none)").matches) return;

      function onMove(e: PointerEvent) {
        const rect = el!.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        spot!.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(226,164,76,0.28), transparent 60%)`;
        spot!.style.opacity = "1";
      }
      function onLeave() {
        spot!.style.opacity = "0";
      }

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${idleGlow ? "motion-safe:animate-[dhaga-glow-pulse_3.2s_ease-in-out_infinite]" : ""} ${className}`}
    >
      <div
        ref={spotRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

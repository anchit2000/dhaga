"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

/** Ticks a number up from 0 once it scrolls into view. Shows the final value immediately under reduced motion. */
export function CountUp({ target, className }: { target: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const counter = { value: 0 };
        gsap.to(counter, {
          value: target,
          duration: 0.9,
          ease: "power2.out",
          snap: { value: 1 },
          onUpdate: () => {
            el.textContent = String(Math.round(counter.value));
          },
          scrollTrigger: { trigger: el, start: "top 70%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [target] },
  );

  return (
    <span ref={ref} className={className}>
      {target}
    </span>
  );
}

"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

/** Wraps a card so it tilts toward the cursor on hover, springing back on leave. No-op under reduced motion or touch. */
export function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
      if (matchMedia("(hover: none)").matches) return;

      const rotateX = gsap.quickTo(inner, "rotateX", { duration: 0.5, ease: "power3.out" });
      const rotateY = gsap.quickTo(inner, "rotateY", { duration: 0.5, ease: "power3.out" });

      function onMove(e: PointerEvent) {
        const rect = outer!.getBoundingClientRect();
        rotateY(((e.clientX - rect.left) / rect.width - 0.5) * 10);
        rotateX(((e.clientY - rect.top) / rect.height - 0.5) * -10);
      }
      function onLeave() {
        rotateX(0);
        rotateY(0);
      }

      outer.addEventListener("pointermove", onMove);
      outer.addEventListener("pointerleave", onLeave);
      return () => {
        outer.removeEventListener("pointermove", onMove);
        outer.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: outerRef },
  );

  return (
    <div ref={outerRef} className={`h-full ${className}`} style={{ perspective: 800 }}>
      <div ref={innerRef} className="h-full [transform-style:preserve-3d] will-change-transform">
        {children}
      </div>
    </div>
  );
}

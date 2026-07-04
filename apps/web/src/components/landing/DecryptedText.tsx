"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const GLYPHS = "!<>-_\\/[]{}=+*^?#";

/**
 * Scrambles into random glyphs, then decrypts left-to-right into the real
 * text once scrolled into view — a terminal-style reveal. Shows the final
 * text immediately, unanimated, under reduced motion.
 */
export function DecryptedText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const chars = text.split("");

      const scramble = (revealCount: number) =>
        chars
          .map((c, i) => (c === " " || i < revealCount ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join("");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        el.textContent = scramble(0);
        const state = { revealed: 0 };
        gsap.to(state, {
          revealed: chars.length,
          duration: 1.1,
          ease: "none",
          snap: { revealed: 1 },
          scrollTrigger: { trigger: el, start: "top 70%", once: true },
          onUpdate: () => {
            el.textContent = scramble(Math.floor(state.revealed));
          },
          onComplete: () => {
            el.textContent = text;
          },
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [text] },
  );

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

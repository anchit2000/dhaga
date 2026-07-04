"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap";

/**
 * Section eyebrow + heading + optional intro, revealed once on scroll-in:
 * the eyebrow's underline draws left-to-right as the heading's words rise
 * into place behind it — the "thread stitching the headline in" effect.
 * Renders fully visible immediately under prefers-reduced-motion.
 */
export function SectionHeading({
  eyebrow,
  heading,
  intro,
  align = "left",
  headingClassName = "max-w-xl",
}: {
  eyebrow: string;
  heading: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  headingClassName?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const heading = root.current?.querySelector<HTMLHeadingElement>("[data-heading]");
      const underline = root.current?.querySelector<HTMLSpanElement>("[data-underline]");
      const intro = root.current?.querySelector<HTMLParagraphElement>("[data-intro]");
      if (!heading) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = new SplitText(heading, { type: "words", mask: "words" });
        gsap.set(split.words, { yPercent: 130, opacity: 0 });
        if (underline) gsap.set(underline, { scaleX: 0 });
        if (intro) gsap.set(intro, { y: 14, opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top 68%", once: true },
        });
        if (underline) {
          tl.to(underline, { scaleX: 1, duration: 0.5, ease: "power2.out" });
        }
        tl.to(
          split.words,
          { yPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.05 },
          underline ? "-=0.25" : 0,
        );
        if (intro) {
          tl.to(intro, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.3");
        }

        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={align === "center" ? "text-center" : ""}>
      <p className="relative inline-block font-mono text-xs uppercase tracking-[0.22em] text-amber">
        {eyebrow}
        <span
          data-underline
          aria-hidden="true"
          className="absolute -bottom-1.5 left-0 h-px w-full origin-left bg-amber/50"
        />
      </p>
      <h2
        data-heading
        className={`mt-4 text-balance font-display text-4xl font-medium sm:text-5xl ${
          align === "center" ? "mx-auto" : ""
        } ${headingClassName}`}
      >
        {heading}
      </h2>
      {intro ? (
        <p
          data-intro
          className={`mt-4 max-w-2xl text-fog ${align === "center" ? "mx-auto" : ""}`}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}

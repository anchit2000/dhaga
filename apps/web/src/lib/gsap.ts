import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // The custom web font swaps in after initial layout and can resize
  // headings enough to change total page height — without this,
  // ScrollTriggers computed against the pre-swap layout can fall out of sync
  // with the final heading and section positions.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

export { gsap, ScrollTrigger, SplitText };

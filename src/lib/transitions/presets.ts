import gsap from "gsap";

import { CSS_EASE } from "~/lib/eases";
import { prefersReducedMotion } from "~/lib/utils";

// The catalog of named page-transition animations. Tag an element data-page-out="fade" to play
// `out` when it leaves, or data-page-in="fade" to play `in` when it enters; the lifecycle wiring in
// ./page-transitions runs the tween and awaits it. `prepare` sets the entering element's start state
// before the first paint, so it never flashes at its final state first. Add an entry here to make a
// new animation available to any element.

// Collapse a duration to 0 when the user prefers reduced motion, so every preset honours it without
// repeating the check.
const motionDuration = (seconds: number) => (prefersReducedMotion() ? 0 : seconds);

export type PagePreset = {
  prepare?: (el: Element) => void;
  out?: (el: Element) => gsap.core.Tween;
  in?: (el: Element) => gsap.core.Tween;
};

export const PAGE_PRESETS: Record<string, PagePreset> = {
  // Cross-fade timing: 0.3s out, 0.4s in, CSS `ease`.
  fade: {
    prepare: (el) => gsap.set(el, { opacity: 0 }),
    out: (el) => gsap.to(el, { opacity: 0, duration: motionDuration(0.3), ease: CSS_EASE }),
    in: (el) =>
      gsap.to(el, {
        opacity: 1,
        duration: motionDuration(0.4),
        ease: CSS_EASE,
        clearProps: "opacity",
      }),
  },

  // Strobe, echoing the homepage frame-button flicker (PageUI_Init in src/js/main.js). Per-keyframe
  // durations let motionDuration collapse it to an instant hide/show. `out` strobes then stays hidden;
  // `in` starts hidden (see prepare) and strobes back to visible.
  blink: {
    prepare: (el) => gsap.set(el, { opacity: 0 }),
    out: (el) =>
      gsap.to(el, {
        ease: "none",
        keyframes: [
          { opacity: 0, duration: motionDuration(0.1) },
          { opacity: 0.45, duration: motionDuration(0.05) },
          { opacity: 0, duration: motionDuration(0.05) },
          { opacity: 0.45, duration: motionDuration(0.05) },
          { opacity: 0, duration: motionDuration(0.1) },
        ],
      }),
    in: (el) =>
      gsap.to(el, {
        ease: "none",
        keyframes: [
          { opacity: 0.45, duration: motionDuration(0.1) },
          { opacity: 0, duration: motionDuration(0.05) },
          { opacity: 0.45, duration: motionDuration(0.05) },
          { opacity: 0, duration: motionDuration(0.05) },
          { opacity: 1, duration: motionDuration(0.1) },
        ],
        clearProps: "opacity",
      }),
  },
};

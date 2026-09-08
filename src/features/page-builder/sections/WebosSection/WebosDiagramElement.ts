import gsap from "gsap";

import { REVEAL_EASE } from "~/lib/eases";
import { whenContentReady } from "~/lib/transitions/content-ready";
import { isInPlaceNavigation } from "~/lib/transitions/in-place";
import { prefersReducedMotion } from "~/lib/utils";

/** Reveal once the diagram is 15% short of the viewport bottom. */
const VIEWPORT_MARGIN = "0px 0px -15% 0px";

/**
 * Builds the WebOS diagram up part by part: each figure card pops in, then assembles from its own
 * vector pieces, and the connecting arrows bridge to the next card. The server renders the finished
 * diagram; this element only hides it just-in-time and replays the build, so no-JS, draft mode and
 * reduced motion all get the complete picture.
 */
export class WebosDiagramElement extends HTMLElement {
  #timeline: gsap.core.Timeline | null = null;
  #spinTweens: gsap.core.Tween[] = [];
  #observer: IntersectionObserver | null = null;
  #cancelled = false;

  connectedCallback() {
    this.#cancelled = false;

    if (prefersReducedMotion()) {
      return;
    }

    // The "Working on it..." spinner is ambient, so it turns whenever motion is allowed at all.
    this.#spin();

    // No draft-mode guard: the diagram carries no stega text, so editors get the build in preview too.
    if (isInPlaceNavigation()) {
      return;
    }

    void this.#play();
  }

  disconnectedCallback() {
    this.#cancelled = true;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#timeline?.kill();
    this.#timeline = null;

    for (const tween of this.#spinTweens) {
      tween.kill();
    }

    this.#spinTweens = [];
  }

  #spin() {
    for (const spinner of this.querySelectorAll<SVGElement>("[data-spinner]")) {
      this.#spinTweens.push(
        gsap.to(spinner, { rotation: 360, duration: 1.4, ease: "none", repeat: -1, transformOrigin: "50% 50%" })
      );
    }
  }

  #whenInViewport(): Promise<void> {
    return new Promise((resolve) => {
      this.#observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.#observer?.disconnect();
            this.#observer = null;
            resolve();
          }
        },
        { rootMargin: VIEWPORT_MARGIN }
      );

      this.#observer.observe(this);
    });
  }

  async #play() {
    const parts = Array.from(this.querySelectorAll<HTMLElement>("[data-diagram-part]"));

    if (parts.length === 0) {
      return;
    }

    // Hidden immediately on upgrade, before the gates, so the finished diagram never flashes.
    gsap.set(parts, { opacity: 0, y: 24 });

    await Promise.all([whenContentReady(), this.#whenInViewport()]);

    if (this.#cancelled) {
      return;
    }

    const timeline = gsap.timeline({ defaults: { ease: REVEAL_EASE } });

    for (const part of parts) {
      const isArrow = part.hasAttribute("data-diagram-arrow");
      timeline.to(part, { opacity: 1, y: 0, duration: isArrow ? 0.4 : 0.55 }, isArrow ? "-=0.15" : "-=0.35");

      if (!isArrow) {
        // The card assembles from its marked blocks while it settles: the chat builds message by
        // message, the stack row by row, the site region by region.
        const pieces = Array.from(part.querySelectorAll<HTMLElement>("[data-diagram-piece]"));

        if (pieces.length > 1) {
          timeline.from(pieces, { opacity: 0, y: 10, duration: 0.35, stagger: { each: 0.22 } }, "<0.08");
        }
      }
    }

    this.#timeline = timeline;
  }
}

if (!customElements.get("webos-diagram")) {
  customElements.define("webos-diagram", WebosDiagramElement);
}

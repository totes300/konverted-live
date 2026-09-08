import gsap from "gsap";
import "~/lib/scroll-trigger";
import { prefersReducedMotion } from "~/lib/utils";
import { MARK_CORNER, MARK_LOOP } from "./mark";

/** How far the strip travels, as a fraction of the viewport width. */
const TRAVEL_VW = 1.2;

const MORPH_DURATION = 1.1;
const MORPH_HOLD = 1.4;
const MORPH_STAGGER = 0.05;

// Two motions in one element. The strip scrubs right-to-left over the section's full travel
// through the viewport, with the distance re-measured on refresh so a resize never bakes stale
// pixels in. The mark morphs its nine source squares between formations on a loop. Every <use>
// instance along the strip mirrors the same squares, so one timeline animates them all, and an
// IntersectionObserver parks the loop while the strip is off screen. Reduced motion skips both:
// the strip stands still at the start of its run, the mark stays the drawn logo.
export class MarqueeStripElement extends HTMLElement {
  #tween: gsap.core.Tween | null = null;
  #timeline: gsap.core.Timeline | null = null;
  #observer: IntersectionObserver | null = null;

  connectedCallback() {
    if (prefersReducedMotion()) {
      return;
    }

    const track = this.querySelector<HTMLElement>("[data-marquee-track]");

    if (track) {
      // Never further than the track has content for, so short strips cannot scrub past their end.
      const travel = () => Math.min(window.innerWidth * TRAVEL_VW, Math.max(track.scrollWidth - window.innerWidth, 0));

      this.#tween = gsap.fromTo(
        track,
        { x: 0 },
        {
          x: () => -travel(),
          ease: "none",
          scrollTrigger: {
            trigger: this,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    }

    const squares = [...this.querySelectorAll<SVGRectElement>("[data-marquee-mark] rect")];

    if (squares.length > 0) {
      this.#timeline = gsap.timeline({ repeat: -1, paused: true });

      MARK_LOOP.forEach((formation, step) => {
        const at = step * (MORPH_DURATION + MORPH_HOLD);

        formation.forEach((cell, index) => {
          const square = squares[index];

          if (square) {
            this.#timeline?.to(
              square,
              {
                attr: { x: cell.x, y: cell.y, width: cell.s, height: cell.s, rx: cell.s * MARK_CORNER },
                duration: MORPH_DURATION,
                ease: "power3.inOut",
              },
              at + index * MORPH_STAGGER
            );
          }
        });
      });

      // An empty beat at the end of the lap, so the drawn mark holds before the loop restarts.
      this.#timeline.set({}, {}, MARK_LOOP.length * (MORPH_DURATION + MORPH_HOLD));

      this.#observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          this.#timeline?.play();
        } else {
          this.#timeline?.pause();
        }
      });
      this.#observer.observe(this);
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#timeline?.kill();
    this.#timeline = null;
    this.#tween?.scrollTrigger?.kill();
    this.#tween?.kill();
    this.#tween = null;
  }
}

if (!customElements.get("marquee-strip")) {
  customElements.define("marquee-strip", MarqueeStripElement);
}

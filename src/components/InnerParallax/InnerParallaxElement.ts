import gsap from "gsap";
import "~/lib/scroll-trigger";
import { prefersReducedMotion } from "~/lib/utils";

// Inner-parallax: the outer element is a fixed-size clipping window; the inner element is oversized
// by `--parallax-overflow` on every edge and slides across that slack as the window scrolls past.
// A scrubbed ScrollTrigger drives the slide from one edge to the other over the element's full
// travel through the viewport ("top bottom" -> "bottom top"), matching the source motion version.
//
// Distances are read from the resolved `--parallax-overflow` through function-based tween values
// with invalidateOnRefresh, so the responsive overflow stays pure CSS and recomputes on resize.
export class InnerParallaxElement extends HTMLElement {
  #inner: HTMLElement | null = null;
  #tween: gsap.core.Tween | null = null;

  #overflow = () => {
    const value = getComputedStyle(this).getPropertyValue("--parallax-overflow");
    return Math.abs(Number.parseFloat(value)) || 0;
  };

  connectedCallback() {
    // Reduced motion keeps the media centered in its window (no scroll-linked movement).
    if (prefersReducedMotion()) {
      return;
    }

    this.#inner = this.querySelector<HTMLElement>("[data-parallax-inner]");

    if (!this.#inner) {
      return;
    }

    const axis = this.dataset.direction === "x" ? "x" : "y";

    this.#tween = gsap.fromTo(
      this.#inner,
      { [axis]: () => -this.#overflow() },
      {
        [axis]: () => this.#overflow(),
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

  disconnectedCallback() {
    this.#tween?.scrollTrigger?.kill();
    this.#tween?.kill();
    this.#tween = null;
    this.#inner = null;
  }
}

if (!customElements.get("inner-parallax")) {
  customElements.define("inner-parallax", InnerParallaxElement);
}

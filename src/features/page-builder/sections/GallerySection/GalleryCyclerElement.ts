import gsap from "gsap";
import "~/lib/scroll-trigger";
import { prefersReducedMotion } from "~/lib/utils";

/** Fallback when the CMS field is absent; the editor sets the real value (`data-cycle-ms`). */
const DEFAULT_CYCLE_MS = 400;

// Two motions in one element. The frames hard-cut on the editor-set interval, but only while the
// section is on screen and only once the whole set has decoded, so an idle tab or a scrolled-past
// gallery burns nothing and the opening cuts never land on a half-loaded frame. The stage starts at
// its CSS rest width and a scrubbed ScrollTrigger widens it to the full viewport on arrival, all
// through function-based values with invalidateOnRefresh so a resize re-measures instead of baking
// stale pixel widths in. Reduced motion skips both: first frame, rest width, no movement.
export class GalleryCyclerElement extends HTMLElement {
  #frames: HTMLElement[] = [];
  #index = 0;
  #interval: ReturnType<typeof setInterval> | null = null;
  #observer: IntersectionObserver | null = null;
  #tween: gsap.core.Tween | null = null;
  #visible = false;
  #ready: Promise<void> | null = null;

  connectedCallback() {
    if (prefersReducedMotion()) {
      return;
    }

    this.#frames = [...this.querySelectorAll<HTMLElement>("[data-gallery-frame]")];

    if (this.#frames.length > 1) {
      this.#observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          this.#startCycling();
        } else {
          this.#stopCycling();
        }
      });
      this.#observer.observe(this);
    }

    const stage = this.querySelector<HTMLElement>("[data-gallery-stage]");

    if (stage) {
      this.#tween = gsap.fromTo(
        stage,
        { width: () => `${GalleryCyclerElement.#restWidth(stage)}px` },
        {
          width: "100%",
          ease: "none",
          scrollTrigger: {
            trigger: this,
            start: "top 80%",
            end: "top 30%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    }
  }

  disconnectedCallback() {
    this.#stopCycling();
    this.#observer?.disconnect();
    this.#observer = null;
    this.#tween?.scrollTrigger?.kill();
    this.#tween?.kill();
    this.#tween = null;
    this.#frames = [];
    this.#ready = null;
  }

  #cycleMs() {
    const value = Number.parseFloat(this.dataset.cycleMs ?? "");

    return Number.isFinite(value) && value > 0 ? value : DEFAULT_CYCLE_MS;
  }

  /**
   * The rest width, measured from the stage's own stylesheet rules (the tween's inline width is
   * cleared for the read, then restored) so CSS stays the single source and a breakpoint change
   * never needs a mirrored constant here. Runs only at tween creation and on ScrollTrigger refresh.
   */
  static #restWidth(stage: HTMLElement) {
    const inlineWidth = stage.style.width;
    stage.style.width = "";
    const width = stage.offsetWidth;
    stage.style.width = inlineWidth;

    return width;
  }

  #startCycling() {
    this.#visible = true;

    if (this.#interval !== null) {
      return;
    }

    this.#ready ??= this.#decodeFrames();
    this.#ready.then(() => {
      if (this.#visible && this.#interval === null) {
        this.#interval = setInterval(this.#next, this.#cycleMs());
      }
    });
  }

  #stopCycling() {
    this.#visible = false;

    if (this.#interval !== null) {
      clearInterval(this.#interval);
      this.#interval = null;
    }
  }

  /**
   * Every frame but the first is `loading="lazy"`, so a cycle that started on arrival would cut to
   * images that are still downloading and paint nothing, so the gallery flickers until the loop has
   * been round once and the browser cache has caught up. Promote the set to eager and wait for the
   * decodes before the first cut. This runs only once the section is on screen, so a visitor who
   * never reaches the gallery still downloads nothing.
   */
  async #decodeFrames() {
    const images = this.#frames.flatMap((frame) => [...frame.querySelectorAll<HTMLImageElement>("img")]);

    await Promise.all(
      images.map((image) => {
        image.loading = "eager";

        // A frame that fails to decode (a 404, a source swapped mid-decode) must not hold the
        // gallery still: the cut past it is a blank either way.
        return image.decode().catch(() => {});
      })
    );
  }

  #next = () => {
    this.#frames[this.#index]?.removeAttribute("data-active");
    this.#index = (this.#index + 1) % this.#frames.length;
    this.#frames[this.#index]?.setAttribute("data-active", "");
  };
}

if (!customElements.get("gallery-cycler")) {
  customElements.define("gallery-cycler", GalleryCyclerElement);
}

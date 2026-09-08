import { canHoverQuery, isRealHover, prefersReducedMotion } from "~/lib/utils";
import { observeCenterFocus, unobserveCenterFocus } from "./center-focus";

/** Fallback when the CMS field is absent; the editor sets the real value (`data-cycle-ms`). */
const DEFAULT_CYCLE_MS = 400;

/** `<video>` and `<mux-player>` both expose these, but the Mux one only once its module has loaded. */
type PlayableMedia = HTMLElement & { play?: () => Promise<void> | void; pause?: () => void };

// The card's preview: a gallery hard-cutting between frames, or a video that starts playing. Both
// idle until the card is pointed at, and both stop again on leave, so a grid of a dozen projects
// costs nothing at rest. A touch device never fires hover, so there the middle of the screen points
// instead (`center-focus`), which keeps the running card to one.
export class CaseStudyCardElement extends HTMLElement {
  #frames: HTMLElement[] = [];
  #media: PlayableMedia | null = null;
  #index = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #observer: IntersectionObserver | null = null;
  #running = false;
  /** Bumped on every stop so a cut still waiting on its decode cannot resume into a newer run. */
  #generation = 0;

  connectedCallback() {
    if (prefersReducedMotion()) {
      return;
    }

    this.#frames = [...this.querySelectorAll<HTMLElement>("[data-card-frame]")];
    this.#media = this.querySelector<PlayableMedia>("video, mux-player");

    if (this.#frames.length < 2 && !this.#media) {
      return;
    }

    if (!canHoverQuery().matches) {
      observeCenterFocus(this, this.#onCenterFocus);

      return;
    }

    this.addEventListener("pointerenter", this.#onEnter);
    this.addEventListener("pointerleave", this.#stop);
    this.addEventListener("focusin", this.#onEnter);
    this.addEventListener("focusout", this.#stop);

    // A cursor arrives with no warning, so a card in view decodes its set before it is asked for.
    // The pointed path warms on start, which is early enough without a cursor to beat.
    this.#observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        this.#warm();
      }
    });
    this.#observer.observe(this);
  }

  disconnectedCallback() {
    unobserveCenterFocus(this);
    this.removeEventListener("pointerenter", this.#onEnter);
    this.removeEventListener("pointerleave", this.#stop);
    this.removeEventListener("focusin", this.#onEnter);
    this.removeEventListener("focusout", this.#stop);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#stop();
    this.#frames = [];
    this.#media = null;
  }

  #cycleMs() {
    const value = Number.parseFloat(this.dataset.cycleMs ?? "");

    return Number.isFinite(value) && value > 0 ? value : DEFAULT_CYCLE_MS;
  }

  /** A frame that cannot decode (a 404, a source swapped mid-decode) must not hold the cut. */
  #decode(index: number) {
    const image = this.#frames[index]?.querySelector<HTMLImageElement>("img");

    if (!image) {
      return;
    }

    // Every frame past the first is lazy, and `decode()` on one the loader has not reached yet never
    // settles, so the cut it gates never lands and the preview looks dead under the cursor.
    image.loading = "eager";

    return image.decode().catch(() => {});
  }

  /**
   * A cut hides the outgoing frame and reveals the incoming one on the same tick, so an incoming
   * bitmap the browser has not decoded yet leaves the stage background showing through the gap,
   * which is the flicker. Decoding on arrival gets the set ready before the cursor can reach it; Chrome
   * evicts bitmaps it is not painting, so the per-cut gate below still has to cover the rest.
   */
  #warm() {
    for (let index = 0; index < this.#frames.length; index += 1) {
      this.#decode(index);
    }
  }

  // Focus is exclusive across the grid, so the card it leaves is put back on its resting frame by
  // the same pass that starts the new one.
  #onCenterFocus = (focused: boolean) => {
    if (focused) {
      this.#start();

      return;
    }

    this.#stop();
  };

  // A tap fires pointerenter and focusin too, and on a hybrid device that would start the preview
  // on the same gesture that follows the link.
  #onEnter = (event: Event) => {
    if (!isRealHover(event)) {
      return;
    }

    this.#start();
  };

  #start() {
    if (this.#running) {
      return;
    }

    this.#running = true;
    this.#warm();

    // No dwell on the resting frame: the cut the cursor arriving asks for is the first one, so
    // waiting a full interval for it reads as the preview taking a moment to wake up.
    if (this.#frames.length > 1) {
      this.#queue(0);
    }

    // Autoplay can still be refused (a data-saver setting, a player that has not upgraded yet).
    const played = this.#media?.play?.();

    if (played instanceof Promise) {
      played.catch(() => {});
    }
  }

  /**
   * The next frame decodes during the current one's dwell and the cut waits on it. A warm bitmap
   * resolves in a fraction of a millisecond, so the beat stays on the editor's interval; an evicted
   * one delays that one cut rather than flashing the stage through it.
   */
  #queue(delayMs: number) {
    const generation = this.#generation;
    const next = (this.#index + 1) % this.#frames.length;
    const decoded = this.#decode(next);

    this.#timer = setTimeout(async () => {
      await decoded;

      if (generation !== this.#generation) {
        return;
      }

      this.#show(next);
      this.#queue(this.#cycleMs());
    }, delayMs);
  }

  // Leaving puts the card back on its resting frame, so the grid never sits on whichever frame the
  // cursor happened to leave it on.
  #stop = () => {
    this.#running = false;
    this.#generation += 1;

    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }

    this.#show(0);
    this.#media?.pause?.();
  };

  #show(index: number) {
    this.#frames[this.#index]?.removeAttribute("data-active");
    this.#index = index;
    this.#frames[this.#index]?.setAttribute("data-active", "");
  }
}

if (!customElements.get("case-study-card")) {
  customElements.define("case-study-card", CaseStudyCardElement);
}

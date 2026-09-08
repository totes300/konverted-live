import { canHoverQuery, prefersReducedMotion } from "~/lib/utils";

/** Share of the remaining distance closed each frame: enough drag to feel weighted, not to feel late. */
const FOLLOW = 0.22;

// A disc this size lands badly if it snaps, so it eases toward the pointer on its own frame loop
// rather than off pointermove: one layout read and one style write per frame either way, and the
// easing keeps running through a scroll the pointer is not driving. The scale in and out is CSS,
// off `data-active` on the host.
export class CaseStudyCursorElement extends HTMLElement {
  #cursor: HTMLElement | null = null;
  #clientX = 0;
  #clientY = 0;
  #x = 0;
  #y = 0;
  #frame: number | null = null;

  connectedCallback() {
    if (!canHoverQuery().matches) {
      return;
    }

    this.#cursor = this.querySelector<HTMLElement>("[data-cursor]");

    if (!this.#cursor) {
      return;
    }

    this.addEventListener("pointerenter", this.#onEnter);
    this.addEventListener("pointermove", this.#onMove);
    this.addEventListener("pointerleave", this.#onLeave);
  }

  disconnectedCallback() {
    this.removeEventListener("pointerenter", this.#onEnter);
    this.removeEventListener("pointermove", this.#onMove);
    this.removeEventListener("pointerleave", this.#onLeave);
    this.#stop();
    this.#cursor = null;
  }

  // A pen or a touch contact fires these too, and neither leaves a pointer on screen to replace.
  #isMouse(event: PointerEvent) {
    return event.pointerType === "mouse";
  }

  #onEnter = (event: PointerEvent) => {
    if (!this.#isMouse(event) || this.#frame !== null) {
      return;
    }

    this.#onMove(event);

    // Placed before the reveal so the disc grows where the pointer is, not where it last left off.
    const rect = this.getBoundingClientRect();
    this.#x = this.#clientX - rect.left;
    this.#y = this.#clientY - rect.top;
    this.#paint();
    this.dataset.active = "";

    this.#frame = requestAnimationFrame(this.#tick);
  };

  #onMove = (event: PointerEvent) => {
    if (!this.#isMouse(event)) {
      return;
    }

    this.#clientX = event.clientX;
    this.#clientY = event.clientY;
  };

  #onLeave = (event: PointerEvent) => {
    if (!this.#isMouse(event)) {
      return;
    }

    delete this.dataset.active;
    this.#stop();
  };

  #stop() {
    if (this.#frame !== null) {
      cancelAnimationFrame(this.#frame);
      this.#frame = null;
    }
  }

  #tick = () => {
    // Read live rather than caching on entry: the page can scroll under a held pointer.
    const rect = this.getBoundingClientRect();
    const ease = prefersReducedMotion() ? 1 : FOLLOW;

    this.#x += (this.#clientX - rect.left - this.#x) * ease;
    this.#y += (this.#clientY - rect.top - this.#y) * ease;
    this.#paint();

    this.#frame = requestAnimationFrame(this.#tick);
  };

  #paint() {
    if (this.#cursor) {
      this.#cursor.style.translate = `${this.#x}px ${this.#y}px`;
    }
  }
}

if (!customElements.get("case-study-cursor")) {
  customElements.define("case-study-cursor", CaseStudyCursorElement);
}

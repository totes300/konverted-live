import { prefersReducedMotion } from "~/lib/utils";

// Sub-pixel slack, so content a hair wider than its room does not become a barely-moving marquee.
const OVERFLOW_TOLERANCE = 1;

/**
 * The marquee is measured, not configured. `[data-marquee-content]` is the single copy the server
 * rendered; whenever the line has to move, it is repeated until one pass of the loop covers the
 * line, the track holds that pass twice, and the animation travels exactly its width, so the copy
 * behind always arrives where the one in front started. Anything that stops it moving takes the
 * duplicates away again and re-centres the original.
 */
export class MarqueeElement extends HTMLElement {
  #viewport: HTMLElement | null = null;
  #track: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #clones: HTMLElement[] = [];
  #resizeObserver: ResizeObserver | null = null;
  #motionQuery: MediaQueryList | null = null;
  #frame = 0;

  #onResize = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(this.#measure);
  };

  connectedCallback() {
    this.#viewport = this.querySelector<HTMLElement>("[data-marquee-viewport]");
    this.#track = this.querySelector<HTMLElement>("[data-marquee-track]");
    this.#content = this.querySelector<HTMLElement>("[data-marquee-content]");

    if (!this.#viewport || !this.#track || !this.#content) {
      return;
    }

    // The content is observed as well as the line around it: a web font landing after the first
    // measurement rewidens the run without the room it sits in ever changing size.
    this.#resizeObserver = new ResizeObserver(this.#onResize);
    this.#resizeObserver.observe(this.#viewport);
    this.#resizeObserver.observe(this.#content);

    this.#motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.#motionQuery.addEventListener("change", this.#onResize);
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;

    this.#motionQuery?.removeEventListener("change", this.#onResize);
    this.#motionQuery = null;

    cancelAnimationFrame(this.#frame);
    this.#frame = 0;

    this.#viewport = null;
    this.#track = null;
    this.#content = null;
    this.#clones = [];
  }

  #number = (name: string, fallback: number) => {
    const value = Number(this.dataset[name]);

    return Number.isFinite(value) ? value : fallback;
  };

  #measure = () => {
    const viewport = this.#viewport;
    const track = this.#track;
    const content = this.#content;

    if (!viewport || !track || !content) {
      return;
    }

    const reserve = this.#number("reserve", 0);

    // `offsetWidth` excludes the margin the loop adds, so this is the natural width either way.
    // Standing still the content is centred, so it gives up the reserved room at both ends. Looping,
    // it has the whole line and whatever covers the ends is the caller's to fade.
    const available = viewport.clientWidth - 2 * reserve;
    const overflows = content.offsetWidth - available > OVERFLOW_TOLERANCE;
    const loops = (this.hasAttribute("data-always") || overflows) && !prefersReducedMotion();

    // Whether the content fits, which is what a caller reads to fade the ends it runs under. The
    // layout keys off the two flags below instead, so a line set to loop regardless still moves.
    this.toggleAttribute("data-overflow", overflows);

    // Exclusive with the animation: without it the tail would be out of reach, so a line that
    // overflows but must not move stays scrollable by hand instead. One that fits has nothing to
    // reach, so it just sits still.
    this.toggleAttribute("data-scroll", overflows && !loops);

    // That fallback needs the covered end as trailing room, or its last words would stop underneath
    // whatever covers them with nothing left to scroll them clear of it.
    track.style.paddingRight = overflows && !loops && reserve ? `${reserve}px` : "";

    if (loops) {
      this.#start(viewport, track, content);
    } else {
      this.#stop();
    }
  };

  #start = (viewport: HTMLElement, track: HTMLElement, content: HTMLElement) => {
    const gap = this.#number("gap", 0);

    content.style.marginRight = `${gap}px`;

    // One pass has to cover the line, or the track would run out before it wraps and leave a gap at
    // the trailing edge. Only ever more than one copy when the content is the narrower of the two.
    const pass = content.offsetWidth + gap;
    const perPass = pass > 0 ? Math.max(1, Math.ceil(viewport.clientWidth / pass)) : 1;

    this.#setCopies(track, content, perPass * 2);

    // Constant speed whatever the content's length. Set on the element rather than through a custom
    // property the keyframe reads: a property declared in the theme substitutes against the root,
    // not against the element the animation runs on.
    track.style.animationDuration = `${(perPass * pass) / this.#number("speed", 60)}s`;

    this.toggleAttribute("data-marquee", true);
  };

  #setCopies = (track: HTMLElement, content: HTMLElement, total: number) => {
    while (this.#clones.length > total - 1) {
      this.#clones.pop()?.remove();
    }

    while (this.#clones.length < total - 1) {
      const clone = content.cloneNode(true) as HTMLElement;

      clone.removeAttribute("data-marquee-content");
      clone.setAttribute("aria-hidden", "true");
      // The duplicates are decorative: they must not be read out, focused, or land in the tab order.
      clone.inert = true;

      track.appendChild(clone);
      this.#clones.push(clone);
    }
  };

  #stop = () => {
    for (const clone of this.#clones) {
      clone.remove();
    }

    this.#clones = [];

    this.#content?.style.removeProperty("margin-right");
    this.#track?.style.removeProperty("animation-duration");

    this.removeAttribute("data-marquee");
  };
}

if (!customElements.get("marquee-line")) {
  customElements.define("marquee-line", MarqueeElement);
}

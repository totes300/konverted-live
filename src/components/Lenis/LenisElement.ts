import Lenis from "lenis";

/** easeInOutCubic, used for in-page anchor scrolls. */
const ANCHOR_SCROLL = {
  duration: 1.2,
  easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

// The links Lenis owns: a plain click on a hash that resolves on the page being viewed. Everything
// else (another page, a new tab, a download, a hash matching nothing) stays with <ClientRouter />
// and the browser.
const inPageTarget = (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);

  if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) {
    return null;
  }

  const url = new URL(anchor.href);
  const samePage = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;

  if (!samePage || !url.hash) {
    return null;
  }

  const element = document.getElementById(decodeURIComponent(url.hash.slice(1)));

  return element ? { element, url } : null;
};

// <ClientRouter /> switches scroll restoration to manual, and the browser drops the fragment scroll
// along with it: every reload of a URL carrying a hash comes back at the top. Landing on the section
// is this element's job then, once per document, and only when the history entry has no scroll
// position of its own (the router restores that, and a reload mid-page should stay where it was).
let hashApplied = false;

const applyHash = (lenis: Lenis) => {
  if (hashApplied) {
    return;
  }

  hashApplied = true;

  const id = decodeURIComponent(location.hash.slice(1));
  const element = id && !history.state?.scrollY ? document.getElementById(id) : null;

  if (element) {
    lenis.scrollTo(element, { immediate: true });
  }
};

// A trackpad keeps delivering a flick as wheel events for up to a second after the fingers lift, and
// a navigation clicked inside that tail lands its page mid-scroll: the instance built for the new
// document takes the rest of the old gesture as input. From the moment a navigation starts, wheel
// events that follow one another closely are that gesture and are swallowed before Lenis sees
// them; the first quiet gap is a new intent and hands the wheel back.
const WHEEL_TAIL_GAP_MS = 150;

let wheelTailUntil = 0;

document.addEventListener("astro:before-preparation", () => {
  wheelTailUntil = performance.now() + WHEEL_TAIL_GAP_MS;
});

window.addEventListener(
  "wheel",
  (event) => {
    const now = performance.now();

    if (now > wheelTailUntil) {
      return;
    }

    wheelTailUntil = now + WHEEL_TAIL_GAP_MS;
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  { capture: true, passive: false }
);

// Behavior only: the document scrolls itself (native scroll restoration comes for free), and this
// element just drives Lenis over the window. Reduced motion is Lenis's own `respectReducedMotion`
// default: it drops smoothing to a 1:1 lerp and makes programmatic scrolls instant, so the instance
// is always up and callers never need a native fallback.
export class LenisElement extends HTMLElement {
  #lenis: Lenis | null = null;
  #rafId = 0;

  #raf = (time: number) => {
    this.#lenis?.raf(time);
    this.#rafId = requestAnimationFrame(this.#raf);
  };

  // Anchors are handled here rather than through Lenis's own `anchors` option because <ClientRouter />
  // answers the click first and jumps the document with `location.href` from inside its handler. Lenis
  // sees the click after that jump and measures the target against a scroll position it does not know
  // moved, so the page snaps back to the top. Cancelling in the capture phase makes the router stand
  // down (it bails on `defaultPrevented`) and leaves the scroll to Lenis alone.
  #onClick = (event: MouseEvent) => {
    const anchor = inPageTarget(event);

    if (!anchor) {
      return;
    }

    event.preventDefault();
    this.#lenis?.scrollTo(anchor.element, ANCHOR_SCROLL);

    // Replace rather than push: the router owns the history stack, and an entry it did not create
    // sends `back` down its full swap path, fading the page out and in just to undo a scroll.
    history.replaceState(history.state, "", anchor.url.href);
  };

  connectedCallback() {
    this.#lenis = new Lenis();
    this.#rafId = requestAnimationFrame(this.#raf);
    document.addEventListener("click", this.#onClick, { capture: true });
    applyHash(this.#lenis);
  }

  // A swap that keeps this element alive (an in-place navigation) moved the document under it, so the
  // momentum the reader threw at the page they left would pull the new one off the landing on the
  // next frame. Immediate is what cuts it: Lenis takes the position and drops the animation with it.
  settleAt(y: number) {
    this.#lenis?.scrollTo(y, { immediate: true, force: true });
  }

  // Overlays (e.g. the modal) pause the page scroll through these instead of reaching into #lenis.
  stop() {
    this.#lenis?.stop();
  }

  start() {
    this.#lenis?.start();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this.#onClick, { capture: true });
    cancelAnimationFrame(this.#rafId);
    this.#lenis?.destroy();
    this.#lenis = null;
  }
}

if (!customElements.get("lenis-scroll")) {
  customElements.define("lenis-scroll", LenisElement);
}

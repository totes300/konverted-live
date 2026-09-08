/** The middle of the screen, as a fraction of its height. A card the band misses never runs. */
const BAND_TOP = 0.3;
const BAND_BOTTOM = 0.7;

type FocusCallback = (focused: boolean) => void;

// A phone has no cursor, so the work grid has no way to know which project the reader means, and a
// card per viewport entry leaves half the column cutting frames out of step. The middle of the
// screen stands in for the cursor: focus belongs to the set, not to a card, so one registry holds
// it and hands it to a single element at a time. Hover devices never register; there a pointer says.
const targets = new Map<HTMLElement, FocusCallback>();

let focused: HTMLElement | null = null;
let frame: number | null = null;

/** Nearest centre to the screen's own, among the cards the band actually holds. */
const centred = () => {
  const height = window.innerHeight;
  const top = height * BAND_TOP;
  const bottom = height * BAND_BOTTOM;
  const middle = height / 2;

  let nearest: HTMLElement | null = null;
  let offset = Number.POSITIVE_INFINITY;

  for (const element of targets.keys()) {
    const rect = element.getBoundingClientRect();

    if (rect.bottom <= top || rect.top >= bottom) {
      continue;
    }

    const distance = Math.abs((rect.top + rect.bottom) / 2 - middle);

    if (distance < offset) {
      offset = distance;
      nearest = element;
    }
  }

  return nearest;
};

const update = () => {
  frame = null;

  const next = centred();

  if (next === focused) {
    return;
  }

  if (focused) {
    targets.get(focused)?.(false);
  }

  focused = next;

  if (focused) {
    targets.get(focused)?.(true);
  }
};

// Native scroll only: Lenis drives the real scroller, and it is not mounted in draft mode.
const schedule = () => {
  if (frame === null) {
    frame = requestAnimationFrame(update);
  }
};

export const observeCenterFocus = (element: HTMLElement, onFocus: FocusCallback) => {
  if (targets.size === 0) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }

  targets.set(element, onFocus);
  schedule();
};

export const unobserveCenterFocus = (element: HTMLElement) => {
  if (!targets.delete(element)) {
    return;
  }

  // The card tears itself down on disconnect, so only the pointer here is left dangling.
  if (focused === element) {
    focused = null;
  }

  if (targets.size > 0) {
    schedule();

    return;
  }

  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);

  if (frame !== null) {
    cancelAnimationFrame(frame);
    frame = null;
  }
};

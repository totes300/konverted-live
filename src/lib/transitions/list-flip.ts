import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import gsap from "gsap";

import { CSS_EASE } from "~/lib/eases";
import { prefersReducedMotion } from "~/lib/utils";
import { isInPlaceNavigation } from "./in-place";

// The motion a list makes across an in-place navigation. Filtering is server-side, so the two lists
// are two separate documents, but a visitor should read it as the one list rearranging: entries the
// incoming list drops fade out while it is still in flight, the survivors FLIP from where they were
// to where they land, and the newcomers arrive behind them.
//
// Mark the container `data-flip-list` and every entry `data-flip-key="<stable id>"`. Module scope
// rather than a custom element, because the state has to outlive the element: the measurements are
// taken on the page being left and replayed on the page arriving.

const LIST = "[data-flip-list]";

const ITEM_KEY = "data-flip-key";

const EXIT_DURATION = 0.2;

const MOVE_DURATION = 0.5;

const ENTER_DURATION = 0.35;

/** Entries arrive once the survivors are most of the way home, so the two phases read as one move. */
const ENTER_DELAY = MOVE_DURATION * 0.45;

const ENTER_STAGGER = 0.04;

/**
 * Positions are stored relative to the list, not the viewport: the swapped-in document starts at the
 * top until the scroll is put back, and the content above the list can reflow between the two renders.
 */
type Offset = { x: number; y: number };

const readItems = () => {
  const list = document.querySelector(LIST);

  if (!list) {
    return null;
  }

  return { origin: list.getBoundingClientRect(), items: Array.from(list.querySelectorAll<HTMLElement>(`[${ITEM_KEY}]`)) };
};

const offsetsOf = (origin: DOMRect, items: HTMLElement[]) => {
  const offsets = new Map<string, Offset>();

  for (const item of items) {
    const rect = item.getBoundingClientRect();

    offsets.set(item.getAttribute(ITEM_KEY) ?? "", { x: rect.left - origin.left, y: rect.top - origin.top });
  }

  return offsets;
};

/** Fade out the entries the incoming list drops, while its response is already parsed and waiting. */
const playExit = (items: HTMLElement[], newDocument: Document) => {
  const surviving = new Set(
    Array.from(newDocument.querySelectorAll(`${LIST} [${ITEM_KEY}]`), (item) => item.getAttribute(ITEM_KEY))
  );

  const leaving = items.filter((item) => !surviving.has(item.getAttribute(ITEM_KEY)));

  if (leaving.length === 0) {
    return Promise.resolve();
  }

  // Opacity alone: a scale reads as deliberate on a card and as a full-width row being sucked inward.
  return gsap.to(leaving, { opacity: 0, duration: EXIT_DURATION, ease: CSS_EASE }).then(() => undefined);
};

// Measured before the swap and consumed by it, so a navigation that never swaps leaves nothing behind.
let previous: Map<string, Offset> | null = null;

document.addEventListener("astro:before-preparation", (event) => {
  const preparation = event as TransitionBeforePreparationEvent;

  previous = null;

  if (!isInPlaceNavigation() || prefersReducedMotion()) {
    return;
  }

  const list = readItems();

  // An empty map still counts: arriving from the no-match state, every entry in the new list enters.
  previous = list ? offsetsOf(list.origin, list.items) : new Map();

  if (!list || list.items.length === 0) {
    return;
  }

  const load = preparation.loader;

  // `newDocument` is only populated once the default loader has parsed the response, so the exit
  // runs after it: the fade costs wall-clock the fetch has already spent.
  preparation.loader = async () => {
    await load();
    await playExit(list.items, preparation.newDocument);
  };
});

document.addEventListener("astro:after-swap", () => {
  const before = previous;

  previous = null;

  if (!before) {
    return;
  }

  const list = readItems();

  if (!list) {
    return;
  }

  const after = offsetsOf(list.origin, list.items);
  const entering: HTMLElement[] = [];

  for (const item of list.items) {
    const key = item.getAttribute(ITEM_KEY) ?? "";
    const from = before.get(key);
    const to = after.get(key);

    if (!from || !to) {
      entering.push(item);
      continue;
    }

    const x = from.x - to.x;
    const y = from.y - to.y;

    if (x === 0 && y === 0) {
      continue;
    }

    gsap.fromTo(item, { x, y }, { x: 0, y: 0, duration: MOVE_DURATION, ease: CSS_EASE, clearProps: "transform" });
  }

  if (entering.length > 0) {
    gsap.fromTo(
      entering,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: ENTER_DURATION,
        delay: ENTER_DELAY,
        stagger: ENTER_STAGGER,
        ease: CSS_EASE,
        clearProps: "transform,opacity",
      }
    );
  }
});

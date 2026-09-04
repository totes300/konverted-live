import type { TransitionBeforePreparationEvent } from "astro:transitions/client";

import type { LenisElement } from "~/components/Lenis/LenisElement";
import { prefersReducedMotion } from "~/lib/utils";
import { closeContentGate, openContentGate } from "./content-ready";
import { isInPlaceNavigation, keepsInPlaceScroll } from "./in-place";
import { PAGE_PRESETS, type PagePreset } from "./presets";

// Drives the page-to-page fades on top of Astro's <ClientRouter />. The router swaps the document and
// re-upgrades every custom element for free, so all this layer does is play the gsap presets at the
// right point in the navigation lifecycle: tagged items fade out before the swap, are hidden pre-paint
// on the way in, then fade in once the new page is live. Everything else (the fixed frame and chrome)
// cuts instantly, because <html> opts out of view-transition animation with transition:animate="none".
// Tag any element data-page-out="fade" / data-page-in="fade"; the catalog lives in ./presets.

const PAGE_OUT_ATTR = "data-page-out";

const PAGE_IN_ATTR = "data-page-in";

// Per-element stagger. data-page-delay-in / data-page-delay-out (seconds) is a STEP, not an absolute
// offset: playPhase walks the tagged elements in DOM order and accumulates the steps, so each item
// starts after the ones above it without hand-computing a running total. Collapsed to 0 under reduced
// motion so the stagger never delays the phase for those users.
const PAGE_DELAY_ATTR = { in: "data-page-delay-in", out: "data-page-delay-out" } as const;

const readStep = (el: Element, phase: "in" | "out") => {
  if (prefersReducedMotion()) {
    return 0;
  }

  const seconds = Number.parseFloat(el.getAttribute(PAGE_DELAY_ATTR[phase]) ?? "");

  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
};

const warnedPresets = new Set<string>();

// Resolve an attribute value to a registered preset. An empty value means "no animation"; a value
// that names no preset is a typo, so warn once in dev to surface it early.
const resolvePreset = (name: string | null): PagePreset | undefined => {
  if (!name) {
    return undefined;
  }

  const preset = PAGE_PRESETS[name];

  if (!preset && import.meta.env.DEV && !warnedPresets.has(name)) {
    warnedPresets.add(name);
    console.warn(`[page-transitions] unknown transition preset "${name}"`);
  }

  return preset;
};

// Play every tagged element's tween for a phase and resolve once all of them have finished.
const playPhase = (attr: string, phase: "in" | "out") => {
  let accumulated = 0;

  const tweens = Array.from(document.querySelectorAll(`[${attr}]`)).flatMap((el) => {
    const tween = resolvePreset(el.getAttribute(attr))?.[phase]?.(el);

    accumulated += readStep(el, phase);

    if (!tween) {
      return [];
    }

    if (accumulated) {
      tween.delay(accumulated);
    }

    return [tween.then(() => undefined)];
  });

  return Promise.all(tweens);
};

// Set the pre-paint start state for every entering element, before the swapped-in page first paints.
const prepareEnter = () => {
  for (const el of Array.from(document.querySelectorAll(`[${PAGE_IN_ATTR}]`))) {
    resolvePreset(el.getAttribute(PAGE_IN_ATTR))?.prepare?.(el);
  }
};

// True only between a swap and its page-load, so the initial (non-swap) load leaves everything alone.
let entering = false;

// Where an in-place navigation left the document, so the swapped-in page can be put back there; 0
// for one the page did not answer, which lands at the top like any other trip to a named URL.
let inPlaceScroll = 0;

// Leaving: fade the current page's tagged items out before the swap. Overriding the loader lets the
// fade overlap the fetch yet still finish before the DOM is swapped.
document.addEventListener("astro:before-preparation", (event) => {
  const preparation = event as TransitionBeforePreparationEvent;
  const load = preparation.loader;

  // No phases and no content gate: an in-place navigation re-renders the page it is already on.
  if (isInPlaceNavigation()) {
    inPlaceScroll = keepsInPlaceScroll() ? window.scrollY : 0;
    return;
  }

  // Close the content-ready gate (AnimatedText waits on it) and show the busy cursor for the
  // whole navigation via `data-vt-loading`.
  closeContentGate();
  document.documentElement.setAttribute("data-vt-loading", "");

  preparation.loader = async () => {
    await Promise.all([playPhase(PAGE_OUT_ATTR, "out"), load()]);
  };
});

// After the swap, before paint: hide the entering items so they don't flash at their final state.
document.addEventListener("astro:after-swap", () => {
  // The router is not the last word on where an in-place navigation lands: it scrolls to the top for
  // a filter change but leaves an identical URL alone, and the `<lenis-scroll>` this swap keeps alive
  // still owns the scroll after either. Both go through the driver so the landing survives the frame.
  if (isInPlaceNavigation()) {
    window.scrollTo(0, inPlaceScroll);
    document.querySelector<LenisElement>("lenis-scroll")?.settleAt(inPlaceScroll);

    return;
  }

  prepareEnter();
  entering = true;
});

// Entering: once the new page is live, fade the tagged items in, then open the content gate so
// in-page intros (AnimatedText) start after the cross-fade.
document.addEventListener("astro:page-load", () => {
  if (isInPlaceNavigation()) {
    return;
  }

  if (!entering) {
    document.documentElement.removeAttribute("data-vt-loading");
    openContentGate();
    return;
  }

  entering = false;
  void playPhase(PAGE_IN_ATTR, "in").then(() => {
    document.documentElement.removeAttribute("data-vt-loading");
    openContentGate();
  });
});

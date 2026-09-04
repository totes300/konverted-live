import { navigate, type TransitionBeforePreparationEvent, type TransitionBeforeSwapEvent } from "astro:transitions/client";

// Links that change the URL without changing the page: a filter that narrows a list leaves the reader
// on the page they were already on. <ClientRouter /> still swaps the whole document for one, so every
// intro element reconnects and would replay its entrance, which reads as a page change the visitor did
// not make. An in-place navigation therefore suppresses the page fade and every intro; the only motion
// is the FLIP the list plays between the two server-rendered versions of itself (./list-flip).
//
// A navigation counts as in-place when it lands on the pathname it started from and the page declares
// a scope below. `data-page-in-place` is not what decides that: it marks the link so the control the
// visitor pressed can show it is working, and browser Back across a filter state has no link at all.
export const IN_PLACE_ATTR = "data-page-in-place";

/**
 * Marks the link a still-unanswered in-place navigation came from, so the control the visitor pressed
 * can show it is working: filtering costs a round trip, and with the page fade gone there is otherwise
 * nothing on screen between the click and the new list. CSS can hang off the link directly; an element
 * that renders a pending state of its own opts in with `data-pending-target` and is marked as well.
 */
export const PENDING_ATTR = "data-pending";

const PENDING_TARGET_ATTR = "data-pending-target";

/**
 * The one subtree an in-place navigation replaces. Everything outside it keeps the DOM it already has,
 * because a full swap re-parses the whole shell from the response and every stateful node starts over:
 * the smooth-scroll driver, the header and the footer all rebuild behind a list that only wanted a
 * different slice of itself. Only scope a navigation this way when both URLs render the same head.
 */
export const SCOPE_ATTR = "data-page-in-place-scope";

/**
 * The roots of a family of URLs one page answers without changing what the visitor is reading (an
 * article and the author panels it opens over itself). Space-separated; both ends of the navigation
 * must fall inside it, so a link that leaves the family is still a page change.
 */
const FAMILY_ATTR = "data-page-in-place-family";

/** The scope's summary of what it now shows, and the region that announces it. See the page-load handler. */
const STATUS_ATTR = "data-page-in-place-status";

const ANNOUNCER_ATTR = "data-page-in-place-announcer";

let inPlace = false;

let keepsScroll = false;

// A reloadInPlace() navigation: every in-place suppression, but Astro's full-document swap, because
// the change that prompted it can live outside the scoped subtree.
const RELOAD_INFO = "in-place-reload";

let fullSwap = false;

const isWithin = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`);

function isSamePage(from: URL, to: URL): boolean {
  if (to.pathname === from.pathname) {
    return true;
  }

  const roots = document.querySelector(`[${FAMILY_ATTR}]`)?.getAttribute(FAMILY_ATTR)?.split(/\s+/).filter(Boolean) ?? [];

  return roots.some((root) => isWithin(from.pathname, root)) && roots.some((root) => isWithin(to.pathname, root));
}

// Where the reader is on the page is theirs to keep only when the page itself answered: a filter
// inside the scope, a card that opens an overlay over the list, or a navigation with no link behind
// it at all (browser Back, `reloadInPlace()`). A link in the site header names a destination, and a
// destination opens at its top however close its URL is to the one being left.
function isAnsweredByPage(source: Element | undefined): boolean {
  return !source || Boolean(source.closest(`[${SCOPE_ATTR}], [${FAMILY_ATTR}]`));
}

// Owned here rather than in a consumer so ESM ordering settles the race: every module that reads the
// flag imports this one, and a dependency's body always runs before its importer's listeners exist.
document.addEventListener("astro:before-preparation", (event) => {
  const preparation = event as TransitionBeforePreparationEvent;

  fullSwap = preparation.info === RELOAD_INFO;
  inPlace = fullSwap || (isSamePage(preparation.from, preparation.to) && Boolean(document.querySelector(`[${SCOPE_ATTR}]`)));
  keepsScroll = inPlace && isAnsweredByPage(preparation.sourceElement);

  const source = preparation.sourceElement?.closest(`[${IN_PLACE_ATTR}]`);

  if (!inPlace || !source) {
    return;
  }

  // The swap discards these nodes, so the pending state ends exactly when the response lands.
  source.setAttribute(PENDING_ATTR, "");
  source.setAttribute("aria-busy", "true");

  for (const target of source.querySelectorAll(`[${PENDING_TARGET_ATTR}]`)) {
    target.setAttribute(PENDING_ATTR, "");
  }
});

document.addEventListener("astro:page-load", () => {
  // Only matches when a navigation was abandoned before its swap: on the usual path the marked nodes
  // left with the old document.
  for (const pending of document.querySelectorAll(`[${PENDING_ATTR}]`)) {
    pending.removeAttribute(PENDING_ATTR);
    pending.removeAttribute("aria-busy");
  }

  // The URL changed but the document did not reload, so nothing else tells assistive tech that the
  // list is now a different list (WCAG 4.1.3). The region lives outside the scope and outlives the
  // swap, because a live region inserted together with its own content is unreliably announced.
  if (inPlace) {
    const summary = document.querySelector(`[${SCOPE_ATTR}]`)?.getAttribute(STATUS_ATTR);
    const announcer = document.querySelector(`[${ANNOUNCER_ATTR}]`);

    if (summary && announcer) {
      announcer.textContent = summary;
    }
  }

  // Cleared a frame later: everything that reconnected during the swap has already read the flag
  // synchronously, while an element upgraded after this (lazy hydration) still gets its intro.
  requestAnimationFrame(() => {
    inPlace = false;
    keepsScroll = false;
    fullSwap = false;
  });
});

document.addEventListener("astro:before-swap", (event) => {
  if (!inPlace || fullSwap) {
    return;
  }

  const swap = event as TransitionBeforeSwapEvent;
  const current = document.querySelector(`[${SCOPE_ATTR}]`);
  const next = swap.newDocument.querySelector(`[${SCOPE_ATTR}]`);

  // Missing on either side is not an error: the navigation falls back to Astro's own full swap.
  if (!current || !next) {
    return;
  }

  swap.swap = () => {
    // Same node on both sides: a navigation the page answered itself never set `newDocument`, and
    // replacing an element with itself would tear the subtree out and re-upgrade everything in it.
    if (current === next) {
      return;
    }

    current.replaceWith(next);

    // Astro re-runs every `<script>` that carries no `data-astro-exec`, and it normally gets that
    // marker from the response it swapped in. Nothing here replaces the head, so the tags that
    // already ran on this document are still unmarked and would be re-inserted.
    for (const script of document.querySelectorAll("script")) {
      script.setAttribute("data-astro-exec", "");
    }
  };
});

/** True for the duration of an in-place navigation, from `astro:before-preparation` to the frame after `astro:page-load`. */
export function isInPlaceNavigation(): boolean {
  return inPlace;
}

/** True while the running in-place navigation is one the page answered itself; see `isAnsweredByPage`. */
export function keepsInPlaceScroll(): boolean {
  return keepsScroll;
}

/**
 * Re-fetches the current URL and swaps the whole document in place (no page fade, scroll kept, no
 * intro replay), for callers that know the server output changed. Resolves once the new page is live.
 */
export function reloadInPlace(): Promise<void> {
  return new Promise((resolve) => {
    document.addEventListener("astro:page-load", () => resolve(), { once: true });
    // No hash: the router answers a same-URL navigation carrying one with a scroll instead of a fetch.
    navigate(`${window.location.pathname}${window.location.search}`, { history: "replace", info: RELOAD_INFO });
  });
}

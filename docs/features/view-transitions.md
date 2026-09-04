# View transitions

Route changes use **Astro's built-in `<ClientRouter />`** (mounted in `src/layouts/Web.astro`) with GSAP-driven page fades layered on top. The router swaps the document client-side and re-upgrades every custom element; the in-repo layer only decides what animates during that swap.

## Files

| File                                        | Role                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/transitions/page-transitions.ts`   | Wires the presets into the navigation lifecycle: tagged elements fade out before the swap (by overriding the preparation `loader`, so the fade overlaps the fetch), are hidden pre-paint after `astro:after-swap`, then fade in on `astro:page-load`.                                         |
| `src/lib/transitions/presets.ts`            | The catalog of named animations (`fade`, `blink`), each with optional `prepare` / `out` / `in` GSAP tweens. Add an entry here to make a new animation available to any element.                                                                                                               |
| `src/lib/transitions/in-place.ts`           | Decides whether a navigation swaps the document at all. A navigation that lands on the pathname it started from, or inside a declared family of URLs, keeps the DOM it has: only the scope element is replaced, and the page fade and every intro are suppressed. Used by the filter bar and by the blog's author panel (see [Dialogs and overlay routes](./dialogs-and-overlay-routes.md)). |
| `src/lib/transitions/scroll-restoration.ts` | Keeps the saved position fresh: the router writes `history.state` only once scrolling fully rests, which Lenis's easing tail delays well past the visible settle, so a quick reload restored a stale offset. Stamps the position during the scroll (throttled) plus a trailing stamp at rest. |

## Usage

Tag any element in a page or layout:

```html
<section data-page-out="fade" data-page-in="fade">...</section>
```

- `data-page-out="<preset>"` plays the preset's `out` tween before the old page is swapped away.
- `data-page-in="<preset>"` hides the element pre-paint (`prepare`) and plays `in` once the new page is live.
- `data-page-delay-in` / `data-page-delay-out` (seconds) add a per-element stagger **step**: elements are walked in DOM order and the steps accumulate, so each item starts after the ones above it.

Everything untagged cuts instantly: `<html>` opts out of the browser's view-transition animation with `transition:animate="none"`, so the fixed frame and chrome never cross-fade.

## Notes

- **Reduced motion:** every preset collapses its durations to 0 via `prefersReducedMotion()`, and stagger steps are dropped, so users who prefer reduced motion get an instant swap.
- An unknown preset name warns once in dev (`[page-transitions] unknown transition preset`), so typos surface early.
- **In-place navigations:** mark the one subtree that may be replaced with `data-page-in-place-scope`, and (when the URL changes) list the URL roots the page answers in `data-page-in-place-family`, space separated. Both ends of the navigation must fall inside the family, so a link out of it is still a page change. When a page answers a navigation itself and never sets `newDocument`, the swap is skipped rather than replacing the scope with itself, which would re-upgrade every custom element inside it.
- **Scroll restoration:** `<ClientRouter />` sets `history.scrollRestoration` to `manual`, so a reload restores only what was saved into `history.state`; `scroll-restoration.ts` is what keeps that fresh under Lenis. The router, Lenis, and this module travel as a set.

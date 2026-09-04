# Animated content

In-page motion is the line-split intro: **`AnimatedText`** (`src/components/AnimatedText/`), used directly and through `SanityRichText`'s `animated` prop (`src/sanity/rich-text/SanityRichText.astro`).

## `AnimatedText` (`src/components/AnimatedText/`)

`AnimatedText.astro` renders an `<animated-text>` host and `AnimatedTextElement.ts` owns all client behavior, built on GSAP SplitText.

- **LCP-safe pre-reveal:** the host SSRs with inline `opacity: 0.001`, imperceptible but a real paint, so the text still counts as the LCP candidate. The element removes it on reveal.
- **Three gates before the intro:** `document.fonts.ready` (line breaks only settle once the real font is in), `whenContentReady()` (holds intros until the page transition finishes), and an IntersectionObserver (`viewport` prop; `false` skips the gate, `margin` overrides the default `0px 0px -10% 0px` rootMargin).
- **Split:** `SplitText.create` with `type: "lines"`, `mask: "lines"` (each line slides out from under an overflow-clipped wrapper), `autoSplit: true` (re-splits on resize once at rest), and `aria: "none"`. `reduceWhiteSpace` follows the target's computed `white-space`: a `pre-line` heading keeps its authored newlines as forced breaks (SplitText turns each into a `<br>`), while collapsed white-space keeps the default so template indentation never becomes a break.
- **Accessibility:** none needed beyond `aria: "none"`. A lines-only split keeps whole words in DOM order, so screen readers read the lines as-is; GSAP's `aria: "auto"` would label the generic `<animated-text>` host (prohibited ARIA) with a `textContent`-derived string that glues text across `<br>`.
- **`as` (default `"span"`):** use `as="div"` when wrapping block-level content (e.g. full rich text) so the split spans all lines in order.
- **`splitSelector`:** optional selector for text-only split targets inside the host (rich text passes `[data-text]`, carried by every block renderer in `src/sanity/rich-text/components/`).
- **Timing props:** `staggerDelay` (default 0.1), `duration` (default 1), `animationDelay` (seconds before the intro).
- **Draft mode / reduced motion:** with `data-draft-mode` on `<html>` (keeps stega-encoded text intact for visual editing) or `prefers-reduced-motion`, the element skips the split entirely and just reveals the server-rendered text.

## Rich text (`SanityRichText.astro`)

`animated` wraps the Portable Text output in `AnimatedText as="div" splitSelector="[data-text]"` with `flex flex-col gap-[1em]`; `animationDelay` and `viewport` pass through. Without `animated`, rich text renders static.

## Shared pieces

- `prefersReducedMotion()` (`src/lib/utils.ts`) is the shared reduced-motion check every animation honours.
- `whenContentReady()` (`src/lib/transitions/content-ready.ts`) is the page-transition gate; see [View transitions](./view-transitions.md).
- `REVEAL_EASE` (`src/lib/eases.ts`) is the shared intro ease.
- Client behavior follows the vanilla custom-element pair described in the `custom-elements` skill (no React on public pages), with heavy deps deferred via `lazyCustomElement` (`src/lib/lazy-hydrate.ts`).

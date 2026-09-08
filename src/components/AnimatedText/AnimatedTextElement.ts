import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

import { REVEAL_EASE } from "~/lib/eases";
import { whenContentReady } from "~/lib/transitions/content-ready";
import { isInPlaceNavigation } from "~/lib/transitions/in-place";
import { prefersReducedMotion } from "~/lib/utils";

gsap.registerPlugin(SplitText);

/** Reveal once the host is 10% short of the viewport bottom. */
const DEFAULT_VIEWPORT_MARGIN = "0px 0px -10% 0px";

/** Renders without text, so an empty one is real content rather than a split artifact. */
const VOID_OR_REPLACED = /^(?:AUDIO|BR|CANVAS|EMBED|HR|IFRAME|IMG|INPUT|OBJECT|PICTURE|SOURCE|SVG|VIDEO)$/;

/**
 * SplitText's `deepSlice` clones a nested inline element when it decides the element wrapped onto a
 * new line, and misreads the element's own first word as a wrap: the word box sits a fraction lower
 * than the inline box around it, so the check fires with no words yet to move and leaves an empty
 * clone behind. Every link, `<strong>`, `<em>`, `<sup>` and colour span in the rich text ends up
 * preceded by an empty duplicate. They paint nothing, but an empty `<a href>` is a tab stop with no
 * accessible name. A genuine slice keeps its text, so dropping only the empty ones leaves real
 * line-wrapping intact; `revert()` restores the pre-split HTML either way.
 */
function pruneEmptyClones(lines: Element[]) {
  for (const line of lines) {
    // Reverse document order, so a parent is judged after the children that would empty it out.
    for (const el of [...line.querySelectorAll("*")].reverse()) {
      if (el.children.length === 0 && !el.textContent?.trim() && !VOID_OR_REPLACED.test(el.tagName)) {
        el.remove();
      }
    }
  }
}

export class AnimatedTextElement extends HTMLElement {
  #splits: SplitText[] = [];
  #tween: gsap.core.Tween | null = null;
  #observer: IntersectionObserver | null = null;
  #cancelled = false;
  #masksClip = true;

  connectedCallback() {
    this.#cancelled = false;
    this.#masksClip = true;

    // Draft mode keeps stega-encoded text intact for visual editing; reduced motion skips the
    // split entirely. Both paths just reveal the server-rendered text.
    if (isInPlaceNavigation() || document.documentElement.hasAttribute("data-draft-mode") || prefersReducedMotion()) {
      this.#sizeUnsplitSpan();
      this.#reveal();
      return;
    }

    // Focus can land while the reveal is still running, before `onComplete` drops the clips. A
    // half-drawn focus ring is worse than ending the masking early, so the first focus in here does.
    this.addEventListener("focusin", this.#stopMaskingLines);

    void this.#play();
  }

  disconnectedCallback() {
    this.#cancelled = true;
    this.removeEventListener("focusin", this.#stopMaskingLines);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#tween?.kill();
    this.#tween = null;

    for (const split of this.#splits) {
      split.revert();
    }

    this.#splits = [];
  }

  #reveal = () => {
    this.style.removeProperty("opacity");
  };

  /**
   * The masks only exist to hide a line while it slides up into place, but they clip at the line
   * box, which is shorter than the inline boxes inside it. Left in place they cut the top off a
   * focus ring (a `ring-2` box-shadow) on any focused link. Once the lines are at rest there is
   * nothing left to hide, so drop the clip; `autoSplit` re-splits get the same treatment below.
   */
  #stopMaskingLines = () => {
    this.#masksClip = false;

    for (const split of this.#splits) {
      this.#unclip(split);
    }
  };

  #unclip = (split: SplitText) => {
    for (const mask of split.masks) {
      (mask as HTMLElement).style.overflow = "visible";
    }
  };

  #onSplit = (split: SplitText) => {
    pruneEmptyClones(split.lines);

    if (!this.#masksClip) {
      this.#unclip(split);
    }
  };

  /**
   * `inline-block` makes the host an atomic inline box, and text decorations never propagate into
   * one, so an ancestor link's underline stops dead at the host (the active nav link loses its
   * rule). The split path does not need the sizing anyway: its line wrappers are block-level and
   * already fill the host, so only the unsplit path gets it.
   */
  #sizeUnsplitSpan() {
    if (this.hasAttribute("data-span")) {
      this.classList.add("inline-block", "max-w-full", "align-top");
    }
  }

  #number(attr: string, fallback: number) {
    const value = Number.parseFloat(this.getAttribute(attr) ?? "");
    return Number.isFinite(value) ? value : fallback;
  }

  #whenInViewport(): Promise<void> {
    if (this.hasAttribute("data-viewport-disabled")) {
      return Promise.resolve();
    }

    const rootMargin = this.getAttribute("data-viewport-margin") ?? DEFAULT_VIEWPORT_MARGIN;

    return new Promise((resolve) => {
      this.#observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.#observer?.disconnect();
            this.#observer = null;
            resolve();
          }
        },
        { rootMargin }
      );

      this.#observer.observe(this);
    });
  }

  async #play() {
    // Fonts settle line breaks, the content gate holds intros until the page fade finishes, and
    // the observer gates on scroll position. All three clear before the reveal runs.
    await Promise.all([document.fonts.ready, whenContentReady(), this.#whenInViewport()]);

    if (this.#cancelled) {
      return;
    }

    const selector = this.getAttribute("data-split-selector");
    const matches = selector ? Array.from(this.querySelectorAll<HTMLElement>(selector)) : [];
    const targets = matches.length > 0 ? matches : [this];

    // mask: "lines" wraps each line in an overflow-clipped span so the reveal slides out from
    // under a mask; autoSplit re-splits on resize (post-animation lines render at rest).
    // aria: "none" because "auto" labels a generic-role target, which ARIA prohibits; splitting by
    // line alone leaves the text readable in order, so no label is needed.
    // A `pre-line` target renders its newlines, so they must survive the split; on collapsed
    // white-space the default stays, or template indentation would become forced breaks.
    this.#splits = targets.map((target) =>
      SplitText.create(target, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        aria: "none",
        reduceWhiteSpace: !getComputedStyle(target).whiteSpace.startsWith("pre"),
        onSplit: this.#onSplit,
      })
    );

    const lines = this.#splits.flatMap((split) => split.lines);

    // Which side of its mask a line waits on. `above` is for copy that sits under something solid
    // (a card's image), so the line drops down out from behind that edge instead of rising past it.
    const fromY = this.getAttribute("data-from") === "above" ? -100 : 100;

    if (lines.length > 0) {
      this.#tween = gsap.fromTo(
        lines,
        { yPercent: fromY, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: this.#number("data-duration", 1),
          delay: this.#number("data-delay", 0),
          stagger: this.#number("data-stagger", 0.1),
          ease: REVEAL_EASE,
          onComplete: this.#stopMaskingLines,
        }
      );
    } else {
      this.#stopMaskingLines();
    }

    this.#reveal();
  }
}

if (!customElements.get("animated-text")) {
  customElements.define("animated-text", AnimatedTextElement);
}

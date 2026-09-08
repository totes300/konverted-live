import gsap from "gsap";
import "~/lib/scroll-trigger";

/** How far back along the axis each circle starts, in percent of its own diameter. */
const TRAVEL = 20;

/** How far behind the scroll the figure trails, in seconds. The drift, and the reason it reads smooth. */
const SCRUB_LAG = 0.9;

/**
 * Draws the section's claim instead of stating it: the two circles start apart on their diagonal,
 * and the page's own scroll walks them together until they share the lens the mark stands in. The
 * server renders the figure finished, so no-JS and reduced motion get the meeting already made;
 * this element only takes it apart again and hands the way back to the scroll.
 */
export class VennDiagramElement extends HTMLElement {
  #media: gsap.MatchMedia | null = null;

  connectedCallback() {
    this.#media = gsap.matchMedia();

    // Reduced motion keeps the server's finished figure, and reverting the query puts every tween,
    // set and trigger back if the preference flips mid-visit.
    this.#media.add("(prefers-reduced-motion: no-preference)", () => {
      // Both the right circle and the round window cutting the lens carry `right`: they are the same
      // circle drawn twice, so they only ever move as one.
      const left = [...this.querySelectorAll<HTMLElement>('[data-venn-side="left"]')];
      const right = [...this.querySelectorAll<HTMLElement>('[data-venn-side="right"]')];
      const labels = [...this.querySelectorAll<HTMLElement>("[data-venn-label]")];
      const lens = this.querySelector<HTMLElement>("[data-venn-lens]");
      const mark = this.querySelector<HTMLElement>("[data-venn-mark]");

      if (left.length === 0 || right.length === 0 || !lens || !mark) {
        return;
      }

      // The diagonal is read off the drawn figure rather than restated here: `offset*` are layout
      // metrics, untouched by the transforms the circles are already carrying, so the direction the
      // pair meets on stays a property of the artwork and this file has no geometry to keep in sync.
      const axis = meetingAxis(left[0], right[0]);

      const timeline = gsap.timeline({
        scrollTrigger: {
          // Nothing is pinned: the figure closes over its own travel up the viewport, and it is
          // whole by the time it sits centred, which is where it is read.
          trigger: this,
          start: "top bottom",
          end: "center center",
          scrub: SCRUB_LAG,
          invalidateOnRefresh: true,
        },
        // Linear, because the scroll is the easing. `force3D` keeps each piece on its own layer for
        // the whole scrub rather than re-rasterising a hairline circle at both ends.
        defaults: { duration: 1, ease: "none", force3D: true },
      });

      timeline
        .from(left, { xPercent: -TRAVEL * axis.x, yPercent: -TRAVEL * axis.y }, 0)
        .from(right, { xPercent: TRAVEL * axis.x, yPercent: TRAVEL * axis.y }, 0)
        // The fill rides inside the right circle, so what it has to cross is the gap between the two
        // sides (both travels, not one) to sit on the left circle in the stage's own space.
        .from(lens, { xPercent: -2 * TRAVEL * axis.x, yPercent: -2 * TRAVEL * axis.y }, 0)
        .from(labels, { autoAlpha: 0, duration: 0.45 }, 0.1)
        // Last, and on its own ease: the mark belongs to the overlap, so it arrives with it.
        .from(mark, { autoAlpha: 0, scale: 0.4, rotation: -14, duration: 0.4, ease: "power2.out" }, 0.6);
    });
  }

  disconnectedCallback() {
    this.#media?.revert();
    this.#media = null;
  }
}

/** The unit vector from the left circle's centre to the right one's: the line the pair travels on. */
function meetingAxis(left: HTMLElement, right: HTMLElement) {
  const x = right.offsetLeft - left.offsetLeft;
  const y = right.offsetTop - left.offsetTop;
  const length = Math.hypot(x, y) || 1;

  return { x: x / length, y: y / length };
}

if (!customElements.get("venn-diagram")) {
  customElements.define("venn-diagram", VennDiagramElement);
}

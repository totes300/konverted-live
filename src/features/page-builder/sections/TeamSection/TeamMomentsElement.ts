import gsap from "gsap";
import { ScrollTrigger } from "~/lib/scroll-trigger";
import { SCREENS } from "~/styles/screens";
import {
  DECK_STAGE,
  deckHeight,
  exitPlacement,
  fanPlacement,
  HERO_ENTRY,
  HERO_OVERSCAN,
  liftPlacement,
  loosePlacement,
  type Placement,
  photoHeight,
  pilePlacement,
  SETTLED,
  sideOf,
  throwPlacement,
} from "./placement";

type Size = { width: number; height: number };

/** A leg of a photo's path: where it goes, over how long, and how. */
type Leg = Placement & { duration: number; ease: string };

/**
 * One choreography per stage. Both start from the pile and move the top card first; they differ in
 * where the photos go, what happens after, and whether the hero gets its finale. Beats are in
 * timeline seconds, stretched over `motion`, so only the ratios matter, and every beat overlaps
 * the next: it is one movement, not a sequence.
 */
type Choreography = {
  /** The stage's height and whether it clips; what is measured for a photo's size is the viewport. */
  stage: { height: string; clip: boolean };
  /** The scroll the stage is held still for, if it is held at all, and the run of scroll the motion plays over. */
  pin: string | null;
  motion: { start: string; end: string };
  /** When every photo has reached its dealt place, and how much later each one after the first sets off. */
  spread: number;
  stagger: number;
  /** Where a photo starts. */
  from: (order: number, count: number) => Placement;
  /** A beat of the finished picture before the stage is let go. */
  settle: number;
  photoHeight: (stage: Size, count: number) => number;
  /** Where a photo is dealt to, and the legs it travels from there. */
  dealt: (order: number, count: number) => Placement;
  onward: (order: number, count: number) => Leg[];
  /**
   * The hero's finale: when it sets off, its size as it rises and where it ends, as multiples of
   * its box, which is the stage's width. Without one the hero is left out and the dealt photos
   * are what the stage ends on.
   */
  hero: { starts: number; entry: number; end: (stage: Size, box: Size) => number } | null;
};

/**
 * A fan to both sides, swept clear off both edges as the hero rises over it and grows to cover the
 * viewport-high stage. The motion starts a viewport before the pin, the moment the stage shows
 * from below, and ends with it.
 */
const WIDE: Choreography = {
  stage: { height: "100svh", clip: true },
  pin: "+=250%",
  motion: { start: "top bottom", end: "+=350%" },
  spread: 1.5,
  stagger: 0.14,
  settle: 0.3,
  from: (order) => pilePlacement(order),
  photoHeight: (viewport, count) => photoHeight(viewport.height, count),
  dealt: (order) => fanPlacement(order),
  onward: (order) => [{ ...exitPlacement(order), duration: 1.4, ease: "power1.inOut" }],
  hero: {
    starts: 1.6,
    entry: HERO_ENTRY,
    end: (stage, box) => Math.max(stage.width / box.width, stage.height / box.height) * HERO_OVERSCAN,
  },
};

/** A card's peel off the deck, a lift then a throw, and how much later the next one goes. */
const LIFT = 0.3;
const THROW = 0.4;
const PEEL_STEP = 0.4;

/**
 * A deck to flip through, on a stage no taller than it needs, and no pin: a held, viewport-high
 * stage leaves empty screen around a compact deck however it is placed. The deck arrives loose and
 * squares up as it comes in; the cards then riffle off the top, up over whatever is above and out
 * to alternate sides, one for every short stretch of scroll while the deck crosses the screen, and
 * the last one straightens and grows to hold the stage before it scrolls on. No hero: a landscape
 * video on a phone is a band of picture between two bands of nothing.
 */
const NARROW: Choreography = {
  stage: { height: DECK_STAGE, clip: false },
  pin: null,
  motion: { start: "top 90%", end: "bottom 60%" },
  spread: 1,
  stagger: 0.05,
  settle: 0.2,
  from: (order) => loosePlacement(order),
  photoHeight: (viewport) => deckHeight(viewport.height),
  dealt: (order) => pilePlacement(order),
  onward: (order, count) => {
    // Peeled from the top, so the bottom card waits for every other one to go.
    const turn = count - 1 - order;
    const wait = { ...pilePlacement(order), duration: turn * PEEL_STEP, ease: "none" };

    if (order === 0) {
      return [wait, { ...SETTLED, duration: LIFT + THROW, ease: "power2.out" }];
    }

    // Gathering pace into the lift, and out of the throw: tossed, and gone before it lands.
    return [
      wait,
      { ...liftPlacement(order), duration: LIFT, ease: "power1.in" },
      { ...throwPlacement(order), duration: THROW, ease: "power1.out" },
    ];
  },
  hero: null,
};

/**
 * How far behind the scroll the motion trails, in seconds. Lenis already smooths the scroll on the
 * public page; this is the extra glide that keeps a flick from snapping the cards.
 */
const SCRUB_LAG = 0.6;

/** The hero's rise from under the stage, then its growth, starting this far into the rise while the last photos are still leaving. */
const RISE = 1.4;
const GROW = 2.1;

/** A caption's fade, once its photo is half way to its place. */
const CAPTION_FADE = 0.3;

// The cards are server-rendered in a plain row. This element lifts them off it, centres every one
// on a viewport-high stage and scrubs a single timeline from the moment the stage shows from below
// to the end of its pinned stretch, following whichever choreography fits the screen.
//
// `gsap.matchMedia` owns the whole thing: reduced motion keeps the row it already has, and every
// set, tween and trigger reverts when the screen crosses the breakpoint.
export class TeamMomentsElement extends HTMLElement {
  #matchMedia: gsap.MatchMedia | null = null;

  connectedCallback() {
    const stage = this.querySelector<HTMLElement>("[data-moments-stage]");

    if (!stage) {
      return;
    }

    this.#matchMedia = gsap.matchMedia();

    this.#matchMedia.add({ wide: `(min-width: ${SCREENS.lg})`, motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      const { wide, motion } = context.conditions ?? {};

      if (!motion) {
        return;
      }

      this.#choreograph(stage, wide ? WIDE : NARROW);
    });
  }

  disconnectedCallback() {
    this.#matchMedia?.revert();
    this.#matchMedia = null;
  }

  #choreograph(stage: HTMLElement, choreography: Choreography) {
    const cards = [...this.querySelectorAll<HTMLElement>("[data-moment-card]")];
    const hero = this.querySelector<HTMLElement>("[data-moment-hero]");
    const photos = cards.filter((card) => card !== hero);

    if (photos.length === 0) {
      return;
    }

    const measure = (): Size => ({ width: stage.offsetWidth, height: stage.offsetHeight });
    const viewport = (): Size => ({ width: window.innerWidth, height: window.innerHeight });

    // The media's proportions, read off the row before the card leaves it. A card is sized by its
    // media box rather than scaled, so the photos stay crisp and the frame stays one thickness.
    const boxOf = (card: HTMLElement) => card.querySelector<HTMLElement>("[data-moment-media]") ?? card;
    const boxes = new Map(
      cards.map((card) => {
        const box = boxOf(card);
        const aspect = box.offsetHeight > 0 ? box.offsetWidth / box.offsetHeight : 3 / 4;

        return [card, { box, aspect }];
      })
    );

    const widthOf = (card: HTMLElement) => choreography.photoHeight(viewport(), photos.length) * (boxes.get(card)?.aspect ?? 1);

    const fit = () => {
      for (const [card, { box }] of boxes) {
        // The hero's box is the whole stage, scaled down for its entrance rather than up for its
        // finale, so the video streams at the size it ends at and stays sharp.
        gsap.set(box, { width: card === hero ? stage.offsetWidth : widthOf(card), flex: "none" });
      }
    };

    if (hero && !choreography.hero) {
      gsap.set(hero, { display: "none" });
    }

    fit();

    // The stage the choreography wants, and every card off the row and onto its centre; from here
    // every place is an offset from the middle.
    gsap.set(stage, { height: choreography.stage.height, overflow: choreography.stage.clip ? "hidden" : "visible" });
    gsap.set(cards, { position: "absolute", left: "50%", top: "50%", xPercent: -50, yPercent: -50, willChange: "transform" });

    photos.forEach((card, order) => {
      // Later photos stack on top, and the caption sits on the card's outward edge, where nothing
      // dealt after it can cover it.
      gsap.set(card, { zIndex: order + 1, flexDirection: sideOf(order) > 0 ? "row-reverse" : "row" });
    });

    // Two triggers on purpose. This one only holds the stage still and animates nothing; the
    // timeline's is free to start before it and end with it.
    if (choreography.pin) {
      ScrollTrigger.create({ trigger: stage, start: "top top", end: choreography.pin, pin: true });
    }

    const timeline = gsap.timeline({
      defaults: { force3D: true },
      scrollTrigger: {
        trigger: stage,
        start: choreography.motion.start,
        end: choreography.motion.end,
        scrub: SCRUB_LAG,
        invalidateOnRefresh: true,
        onRefreshInit: fit,
      },
    });

    // Function values throughout: `invalidateOnRefresh` re-runs them, so a resize re-measures the
    // stage instead of replaying a path solved for the old window. `fromTo` rather than `to`: a
    // scrub seeks back and forth, and `to` would record its start from wherever the card was.
    const at = (place: () => Placement) => ({
      x: () => place().x * stage.offsetWidth,
      y: () => place().y * stage.offsetHeight,
      rotation: () => place().rotate,
      scale: () => place().scale ?? 1,
      autoAlpha: () => place().alpha ?? 1,
    });

    const { spread, stagger } = choreography;

    // From the top of the pile, the last photo first: it sets off earliest with the furthest to
    // go, so it is the fastest, and they all arrive together. One path per card, the dealt place a
    // waypoint on it: easing out into it and straight back in out of it makes it a slow point, not
    // a stop.
    photos.forEach((card, order) => {
      const start = (photos.length - 1 - order) * stagger;
      const legs = choreography.onward(order, photos.length);

      timeline.fromTo(
        card,
        at(() => choreography.from(order, photos.length)),
        {
          keyframes: [
            { ...at(() => choreography.dealt(order, photos.length)), duration: spread - start, ease: "power2.out" },
            ...legs.map((leg, index) => ({
              ...at(() => choreography.onward(order, photos.length)[index]),
              duration: leg.duration,
              ease: leg.ease,
            })),
          ],
        },
        start
      );

      const caption = card.querySelector<HTMLElement>("[data-moment-caption]");

      if (caption) {
        timeline.fromTo(caption, { autoAlpha: 0 }, { autoAlpha: 1, duration: CAPTION_FADE, ease: "none" }, (start + spread) / 2);
      }
    });

    const finale = choreography.hero;

    if (hero && finale) {
      const heroBox = boxOf(hero);

      // The hero paints over everything; its caption goes, because a label beside the video would
      // widen the card and shift the video off the centre by half the label.
      gsap.set(hero, { zIndex: photos.length + 1 });
      gsap.set(hero.querySelector("[data-moment-caption]"), { display: "none" });

      timeline.fromTo(
        hero,
        { y: () => (stage.offsetHeight + heroBox.offsetHeight * finale.entry) / 2 },
        // Quick in, slow to settle: on the stage while the photos are still on their way out.
        { y: 0, duration: RISE, ease: "power1.out" },
        finale.starts
      );

      // One growth, linear, starting the instant the rise does. Split into an arrival that settles at
      // an entry size and a later swell (which is what this used to be), the hero slides in at what
      // reads as a fixed width and only grows once it has already landed. Tied straight to the
      // scroll it gets bigger the whole way up, which is the thing being watched.
      timeline.fromTo(
        hero,
        { scale: finale.entry },
        {
          scale: () => finale.end(measure(), { width: heroBox.offsetWidth, height: heroBox.offsetHeight }),
          duration: GROW,
          ease: "none",
        },
        finale.starts
      );
    }

    timeline.to({}, { duration: choreography.settle });
  }
}

if (!customElements.get("team-moments")) {
  customElements.define("team-moments", TeamMomentsElement);
}

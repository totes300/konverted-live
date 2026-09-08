// Where the postcards sit. `rowDrift` shapes the static row the page ships with (no JS, reduced
// motion). The pile, the fan and the deck are what `TeamMomentsElement` scrubs between; all are
// given as shares of the stage so one table serves every viewport.

/**
 * The static row's vertical stagger, as a percentage of the track's width (a margin, not a
 * transform, so GSAP owns the card's transform alone).
 */
const ROW_DRIFT = [-1.4, 1.2, -2.1, 0.6, 2.3];

/**
 * A photo's height in the pile and the fan, as a share of the stage's height, and how many steps
 * of fan each side holds at that size. More photos than that and they shrink to keep fitting.
 */
const PHOTO_HEIGHT = 0.48;
const FAN_STEPS = 3;

/**
 * The hero's size as it rises, as a share of the stage's width. Its box is the whole stage and it
 * is scaled down for the entrance rather than up for the finale, so the video streams at the size
 * it ends at and stays sharp.
 */
export const HERO_ENTRY = 0.44;

/** A little past covering the stage, so no edge shows while the hero finishes arriving. */
export const HERO_OVERSCAN = 1.04;

/**
 * The fan: each step outward from the centre adds a stride and a little more lean, and neighbours
 * alternate up and down so they overlap at corners rather than lying on each other. The two cards
 * of a step mirror across the centre.
 */
const FAN = { innerX: 0.11, strideX: 0.155, drift: 0.1, tilt: 3, tiltStep: 3 };

/** Where a photo is clear of the stage: past the edge whatever its width, tilted and drifted harder on the way. */
const EXIT = { x: 0.72, drift: 1.6, tilt: 1.6 };

/**
 * The narrow stage's deck: the pile, sized to be flipped through, on a stage only a little taller
 * than itself. It arrives loose, a few times the pile's jitter, and tightens as it comes up; then
 * each card peels off the top: a lift clear of the deck, then a throw up past the stage and out to
 * its side with a lean, fading as it goes. The last one straightens and grows to hold the stage.
 */
const DECK = {
  height: 0.5,
  headroom: 1.12,
  loose: 4,
  looseTilt: 2.2,
  looseDrop: 0.06,
  lift: { x: 0.05, y: -0.35, tilt: 5 },
  throw: { x: 0.15, y: -1, tilt: 12 },
  settledScale: 1.06,
};

/** The pile's jitter, one entry per card: a stack squared up by hand, not by a machine. */
const PILE = [
  { x: -0.006, y: 0.004, tilt: -5 },
  { x: 0.008, y: -0.006, tilt: 4 },
  { x: -0.003, y: -0.003, tilt: -2 },
  { x: 0.005, y: 0.007, tilt: 6 },
  { x: -0.009, y: 0.002, tilt: -7 },
  { x: 0.004, y: -0.005, tilt: 3 },
  { x: -0.005, y: 0.006, tilt: -4 },
  { x: 0.007, y: -0.002, tilt: 5 },
  { x: -0.002, y: -0.007, tilt: -3 },
  { x: 0.003, y: 0.005, tilt: 2 },
  { x: -0.007, y: 0.003, tilt: -6 },
  { x: 0.006, y: -0.004, tilt: 7 },
];

export const rowDrift = (index: number) => ROW_DRIFT[index % ROW_DRIFT.length];

/** A place on the stage: offsets as shares of the stage's width and height, tilt in degrees, and a size or an opacity where it is not 1. */
export type Placement = { x: number; y: number; rotate: number; scale?: number; alpha?: number };

/** Which side of the hero a photo fans to: the photos alternate, so content order still reads left to right. */
export const sideOf = (order: number) => (order % 2 === 0 ? -1 : 1);

/** How tall a photo is on a stage of `stageHeight`, given how many photos share it. */
export const photoHeight = (stageHeight: number, count: number) =>
  stageHeight * PHOTO_HEIGHT * Math.min(1, FAN_STEPS / Math.ceil(count / 2));

export function fanPlacement(order: number): Placement {
  const side = sideOf(order);
  const step = Math.floor(order / 2);
  const up = step % 2 === 0 ? -1 : 1;

  return {
    x: side * (FAN.innerX + step * FAN.strideX),
    y: up * -side * FAN.drift,
    rotate: side * (FAN.tilt + step * FAN.tiltStep),
  };
}

export function exitPlacement(order: number): Placement {
  const fan = fanPlacement(order);

  return { x: sideOf(order) * EXIT.x, y: fan.y * EXIT.drift, rotate: fan.rotate * EXIT.tilt };
}

/** A photo's height in the deck, as a share of the viewport's height, and the stage that holds it, as CSS. */
export const deckHeight = (viewportHeight: number) => viewportHeight * DECK.height;
export const DECK_STAGE = `${DECK.height * DECK.headroom * 100}svh`;

/** The deck before it has been squared up: the pile's jitter, only more so, and sitting a little low. */
export function loosePlacement(order: number): Placement {
  const pile = pilePlacement(order);

  return { x: pile.x * DECK.loose, y: pile.y * DECK.loose + DECK.looseDrop, rotate: pile.rotate * DECK.looseTilt };
}

/** A card lifted off the deck, just clear of the ones beneath, starting to lean to its side. */
export function liftPlacement(order: number): Placement {
  const side = sideOf(order);

  return { x: side * DECK.lift.x, y: DECK.lift.y, rotate: pilePlacement(order).rotate + side * DECK.lift.tilt };
}

/** Where the throw ends: past the stage, out to its side, leaning into it, gone. */
export function throwPlacement(order: number): Placement {
  const side = sideOf(order);

  return { x: side * DECK.throw.x, y: DECK.throw.y, rotate: pilePlacement(order).rotate + side * DECK.throw.tilt, alpha: 0 };
}

/** The last card, once it has the stage to itself. */
export const SETTLED: Placement = { x: 0, y: 0, rotate: 0, scale: DECK.settledScale };

export function pilePlacement(order: number): Placement {
  const slot = PILE[order % PILE.length];

  return { x: slot.x, y: slot.y, rotate: slot.tilt };
}

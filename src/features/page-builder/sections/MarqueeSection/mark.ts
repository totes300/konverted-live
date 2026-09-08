/**
 * The webOS mark decomposed into the nine squares the drawing is made of: the big plus is four
 * corner-touching grid cells, then the trail of shrinking squares runs up-left. Rendering the
 * squares individually lets the morph move each one on its own while the no-JS page still shows
 * the true mark. Coordinates live in the mark's own viewBox.
 */
export type MarkCell = { x: number; y: number; s: number };

export const MARK_VIEWBOX = "0 0 143 142";

const MARK_WIDTH = 143;
const MARK_HEIGHT = 142;

/** Corner radius as a fraction of a square's size, matching the source SVG's rounding. */
export const MARK_CORNER = 0.12;

export const MARK_BASE: MarkCell[] = [
  { x: 111.8, y: 50.8, s: 30.5 },
  { x: 20.3, y: 81.2, s: 30.4 },
  { x: 81.3, y: 81.2, s: 30.4 },
  { x: 50.8, y: 111.6, s: 30.4 },
  { x: 50.9, y: 50.7, s: 25.4 },
  { x: 86.5, y: 25.4, s: 20.4 },
  { x: 0, y: 60.9, s: 15.3 },
  { x: 30.5, y: 30.4, s: 10.2 },
  { x: 61, y: 0, s: 10.2 },
];

const mirrorX = (cells: MarkCell[]): MarkCell[] => cells.map(({ x, y, s }) => ({ x: MARK_WIDTH - x - s, y, s }));

const mirrorY = (cells: MarkCell[]): MarkCell[] => cells.map(({ x, y, s }) => ({ x, y: MARK_HEIGHT - y - s, s }));

/**
 * One lap of the morph: the drawn mark carried through its four orientations, one axis flipped at
 * a time (right, then down, then left, then back). Every frame is the logo itself rather than an
 * arrangement invented for the animation, and a reflection only ever slides a square — none of
 * them resizes — so the motion stays small and the mark stays readable throughout. It ends back on
 * the drawn mark, so the loop is seamless.
 */
export const MARK_LOOP: MarkCell[][] = [mirrorX(MARK_BASE), mirrorY(mirrorX(MARK_BASE)), mirrorY(MARK_BASE), MARK_BASE];

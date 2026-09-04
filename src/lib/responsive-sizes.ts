import { SCREENS, type Screen } from "~/styles/screens";

const BREAKPOINT = new RegExp(`^(${Object.keys(SCREENS).join("|")}):(.+)$`);

/**
 * Expand a Tailwind-style responsive shorthand into a valid `<img sizes>` value, so call sites name
 * each breakpoint once instead of repeating `(min-width: ...)`. Parts split on spaces or commas; a
 * part with no breakpoint prefix is the default (unconditional) value.
 *
 * @example
 * responsiveSizes('100vw md:50vw xl:25vw')
 * // '(min-width: 80rem) 25vw, (min-width: 48rem) 50vw, 100vw'
 */
export function responsiveSizes(shorthand: string): string {
  let fallback = "100vw";
  const queries: { min: number; rule: string }[] = [];

  for (const part of shorthand.split(/[\s,]+/).filter(Boolean)) {
    const match = part.match(BREAKPOINT);

    if (!match) {
      fallback = part;
      continue;
    }

    const [, prefix, value] = match;
    const min = SCREENS[prefix as Screen];

    queries.push({ min: Number.parseFloat(min), rule: `(min-width: ${min}) ${value}` });
  }

  // `sizes` is read left to right and the first matching condition wins, so emit the widest
  // breakpoint first and let the unconditional fallback come last.
  queries.sort((a, b) => b.min - a.min);

  return queries.length ? `${queries.map((query) => query.rule).join(", ")}, ${fallback}` : fallback;
}

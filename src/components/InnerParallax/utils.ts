import { type Screen, screens } from "~/features/dom/constants";
import { parseResponsiveValues } from "~/features/dom/utils";

function normalizeValue(value: string): string {
  const trimmed = value.trim();

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}px`;
  }

  return trimmed;
}

/**
 * Turn a Tailwind-style responsive overflow shorthand (e.g. "60 lg:120") into a set of
 * `--parallax-overflow-*` CSS custom properties plus the per-breakpoint classes that promote them
 * into the active `--parallax-overflow`. Framework-free: the element reads the resolved value from
 * `--parallax-overflow`, so the responsive value stays pure CSS and updates on resize for free.
 */
export function createResponsiveOverflow(overflow: string | number) {
  const overflowString = typeof overflow === "number" ? `${overflow}px` : overflow;
  const parsed = parseResponsiveValues(overflowString);
  const breakpoints = Object.keys(screens) as Screen[];

  const styles: Record<string, string> = {};

  const defaultValue = normalizeValue(parsed.DEFAULT?.value ?? overflowString);
  styles["--parallax-overflow-DEFAULT"] = defaultValue;

  // Inherit the previous breakpoint's value when a screen is missing, mirroring how Tailwind's
  // min-width variants cascade upward.
  let previousValue = defaultValue;

  for (const breakpoint of breakpoints) {
    const currentValue = normalizeValue(parsed[breakpoint]?.value || previousValue);
    styles[`--parallax-overflow-${breakpoint}`] = currentValue;
    previousValue = currentValue;
  }

  return {
    styles,
    classes: [
      "[--parallax-overflow:var(--parallax-overflow-DEFAULT)]",
      "sm:[--parallax-overflow:var(--parallax-overflow-sm)]",
      "md:[--parallax-overflow:var(--parallax-overflow-md)]",
      "lg:[--parallax-overflow:var(--parallax-overflow-lg)]",
      "xl:[--parallax-overflow:var(--parallax-overflow-xl)]",
      "2xl:[--parallax-overflow:var(--parallax-overflow-2xl)]",
    ],
  };
}

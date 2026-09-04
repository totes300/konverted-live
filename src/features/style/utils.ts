// biome-ignore-all lint/style/noRestrictedImports: this is the seam the ban points at.
import { extendTailwindMerge } from "tailwind-merge";

function isValidTextSize(cn: string) {
  // Any class that starts with one of the custom fluid type-scale prefixes is a font-size
  // utility, e.g. `text-body-10`, `text-headline-20` (see src/styles/typography.css).
  return ["title", "subtitle", "body", "caption", "cta", "eyebrow", "headline"].some((val) => cn.startsWith(val));
}

// @see https://github.com/dcastil/tailwind-merge/blob/main/docs/configuration.md#theme
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [isValidTextSize],
    },
  },
});

type ClassValue = string | number | false | null | undefined | ClassValue[];

function flatten(values: ClassValue[], out: string[]): string[] {
  for (const value of values) {
    if (!value && value !== 0) {
      continue;
    }

    if (Array.isArray(value)) {
      flatten(value, out);
    } else {
      out.push(String(value));
    }
  }

  return out;
}

/**
 * Join class values (strings, arrays, falsy conditionals) and resolve Tailwind conflicts with
 * tailwind-merge, so caller-supplied classes reliably override component defaults.
 * Use this instead of `class:list` whenever a component merges its own classes with a `class` prop.
 */
export function cx(...inputs: ClassValue[]): string {
  return twMerge(flatten(inputs, []).join(" "));
}

import { stegaClean } from "@sanity/client/stega";

/**
 * Resolves the brand token name a colour annotation stores (see `sanity/colors.ts`) to the CSS variable
 * that holds its value, so editing the token in `src/styles/colors.css` reaches published content.
 *
 * `stegaClean` first: in preview the string carries invisible characters, and this one ends up inside a
 * CSS value rather than on screen.
 */
export function tokenColor(value: string | null | undefined): string | undefined {
  const name = stegaClean(value ?? "");

  return name ? `var(--color-${name})` : undefined;
}

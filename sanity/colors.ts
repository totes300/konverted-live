/**
 * The brand palette the Studio offers wherever content carries a colour.
 *
 * Only the brand ramp: a semantic token (`danger`, and whatever a project adds beside it) carries a
 * meaning rather than a colour, and is free to change with the design system, so a passage painted
 * with one would change meaning under it.
 *
 * `name` is what gets stored, not the hex. The app renders it as `var(--color-<name>)`, so the value
 * keeps living in the app's stylesheet, and editing a token there reaches published content.
 * `swatch` is Studio chrome only: the editor needs to see the colour it is picking, and the Studio
 * does not load the site's stylesheet. `colors.test.ts` fails if it drifts from the real token.
 */
export type BrandColor = {
  name: string;
  title: string;
  swatch: string;
};

export const BRAND_COLORS: readonly BrandColor[] = [
  { name: "brand-black", title: "Black", swatch: "#1a0401" },
  { name: "brand-white", title: "White", swatch: "#fff" },
  { name: "brand-off-white", title: "Off White", swatch: "#fcfbf9" },
  { name: "brand-grey", title: "Grey", swatch: "#8a8a8a" },
  { name: "brand-accent", title: "Accent", swatch: "#ec5532" },
];

export function findBrandColor(name: string | undefined): BrandColor | undefined {
  return BRAND_COLORS.find((color) => color.name === name);
}

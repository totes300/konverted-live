import { stegaClean } from "@sanity/client/stega";

/**
 * The layout switches every section shares (`sectionLayoutFields` in
 * `sanity/schemas/fields/create-page-builder.tsx`). Adding one is three edits, never per-section:
 * the Sanity field, the `SECTION_SETTINGS` slice, and `sectionLayout` to turn it into classes.
 */

/** The settings slice every section query selects. Interpolated into `defineQuery` template literals. */
export const SECTION_SETTINGS = `"settings": sectionSettings{
      "hash": coalesce(sectionHash.current, _key),
      "width": coalesce(width, "column"),
    }`;

export type SectionLayoutSettings = {
  width?: string | null;
};

/**
 * The classes a section's root carries. Three widths, editor-picked: capped to the content column
 * (default), full bleed with the page margin kept, or edge to edge with no margin at all — the
 * last for sections whose insides own their proportions (the hero's linear composition, the
 * gallery's stage that animates out to the viewport edge).
 */
export function sectionLayout(settings?: SectionLayoutSettings | null) {
  // In draft mode the value carries stega metadata, which a strict compare would read as "column".
  const width = stegaClean(settings?.width);

  if (width === "edge") {
    return "w-full";
  }

  if (width === "bleed") {
    return "w-full px-(--page-gutter)";
  }

  return "mx-auto w-full max-w-(--page-width) px-(--page-gutter)";
}

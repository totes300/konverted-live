// The only module allowed to import `sanity:client` (Biome noRestrictedImports enforces it):
// every other consumer gets its client from here, so config seams stay in one place.

// biome-ignore lint/style/noRestrictedImports: this module IS the seam.
import { sanityClient as baseClient } from "sanity:client";
import { SANITY_API_EDIT_TOKEN } from "~/lib/env";

/**
 * `useCdn` is true only in development (cheap CDN reads while iterating). Production bypasses
 * the CDN: freshness comes from the tag cache (`/api/revalidate` busts tags, the next render
 * hits the live API), so CDN propagation delay would only add staleness on top.
 */
export const sanityClient = baseClient.withConfig({ useCdn: import.meta.env.DEV });

/**
 * Write-capable client for API routes (AI generation, asset uploads, form submissions).
 * Never import in page rendering paths. `published` perspective for its reads; generation
 * routes that need drafts override per call with `.withConfig({ perspective: "drafts" })`.
 */
export const sanityEditClient = baseClient.withConfig({
  token: SANITY_API_EDIT_TOKEN,
  useCdn: false,
  perspective: "published",
  stega: false,
});

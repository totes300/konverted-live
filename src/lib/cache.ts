// Cache tag model, shared by the pages that set tags and the /api/revalidate webhook that
// invalidates them. Tags follow one convention: the document _type, a
// doc:<id> tag, and the routed uri. Every page also carries the site singleton's _type ('site')
// because the header, footer, and SEO defaults render on every page: publishing the Site
// singleton invalidates the whole site through that one tag. The site-wide settings are a second
// such tag, since the favicon they own renders in every page head.

import { SANITY_SINGLETON_SITE_ID, SANITY_SINGLETON_SITE_SETTINGS_ID } from "~/sanity/constants";

/**
 * Invalidation is publish-driven only: the /api/revalidate webhook expires a document's tags the
 * moment it is published, and nothing expires on a timer. The year-long maxAge exists because the
 * cache API requires one; a cached page lives until a publish busts it (or the server process is
 * replaced, since the store is in memory).
 */
export const CACHE_TTL = {
  maxAge: 31536000,
} as const;

/**
 * The two site-wide singletons, as the `_type` tags a publish of either one invalidates. Every
 * response they can change carries both: `site` owns the header, footer and SEO defaults, and
 * `siteSettings` owns the favicon that renders in the same head.
 */
export const SITE_WIDE_CACHE_TAGS = [SANITY_SINGLETON_SITE_ID, SANITY_SINGLETON_SITE_SETTINGS_ID];

/** Stable per-document tag; draft ids collapse onto their published id. */
export function docTag(id: string): string {
  return `doc:${id.replace(/^drafts\./, "")}`;
}

/** The tags a routed document's response carries, and the ones a publish invalidates. */
export function docCacheTags({ _id, _type, uri }: { _id: string; _type: string; uri?: string | null }): string[] {
  const tags = [_type, docTag(_id)];

  if (uri) {
    tags.push(uri);
  }

  return tags;
}

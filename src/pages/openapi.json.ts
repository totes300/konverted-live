import type { APIRoute } from "astro";
import { buildOpenApiDocument } from "~/features/api/openapi";
import { SiteQuery } from "~/features/site/query";
import { CACHE_TTL, SITE_WIDE_CACHE_TAGS } from "~/lib/cache";
import { PUBLIC_SITE_URL } from "~/lib/env";
import type { SiteQueryResult } from "~/sanity/types";
import { loadQuery } from "../sanity/lib/load-query";

/**
 * Serves an OpenAPI 3.1 description of the public machine surface, so an agent can discover what is
 * callable without scraping. Name and description come from the Site singleton, so a fresh clone
 * describes its own site; publishing Site invalidates the entry through the site-wide tags.
 */
export const GET: APIRoute = async ({ cache }) => {
  cache.set({ ...CACHE_TTL, tags: [...SITE_WIDE_CACHE_TAGS] });

  const { data: site } = await loadQuery<SiteQueryResult>({ query: SiteQuery });

  const document = buildOpenApiDocument({
    baseUrl: PUBLIC_SITE_URL,
    siteName: site?.name ?? undefined,
    description: site?.seoMetadata?.description ?? undefined,
  });

  return Response.json(document, {
    headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
};

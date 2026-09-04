import type { APIRoute } from "astro";
import { SiteQuery } from "~/features/site/query";
import { FAVICON_MIME, FAVICON_ROUTE_PX, getFaviconImageSrc, resolveFaviconAsset } from "~/features/site/seo/favicon";
import { CACHE_TTL, SITE_WIDE_CACHE_TAGS } from "~/lib/cache";
import type { SiteQueryResult } from "~/sanity/types";
import { loadQuery } from "../sanity/lib/load-query";

/**
 * An endpoint rather than a static `public/favicon.ico`: the icon lives in the CMS, and the head
 * links point at CDN URLs that move whenever an editor swaps the asset. This path never moves, so
 * it is the stable URL Google can keep crawling.
 */
export const GET: APIRoute = async ({ cache }) => {
  // The icon lives on Settings, so publishing that singleton is what invalidates it.
  cache.set({ ...CACHE_TTL, tags: [...SITE_WIDE_CACHE_TAGS] });

  const { data: site } = await loadQuery<SiteQueryResult>({ query: SiteQuery });
  const asset = resolveFaviconAsset(site?.favicon);

  if (!asset) {
    return new Response(null, { status: 404 });
  }

  const upstream = await fetch(getFaviconImageSrc(asset, FAVICON_ROUTE_PX));

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: 502 });
  }

  // Proxied rather than redirected: a 302 to the CDN would hand Google the unstable URL again.
  return new Response(upstream.body, {
    headers: {
      "content-type": FAVICON_MIME,
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
};

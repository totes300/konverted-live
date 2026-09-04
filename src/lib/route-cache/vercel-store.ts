// Vercel's Runtime Cache behind the `RouteCacheStore` seam. This is the store that survives a
// deploy: Vercel's CDN cache key includes the unique deployment URL, so a CDN-backed cache starts
// cold on every release, while the Runtime Cache is documented as persistent across deployments
// (and split per environment, so staging never reads production's entries).
//
// It is also reached from inside the function, which is what keeps the gated (Basic Auth) staging
// site cacheable at all: Vercel's CDN refuses to store any response to a request carrying an
// `Authorization` header, so a cache sitting in front of the app could never hold those pages.

import { getCache, invalidateByTag } from "@vercel/functions";
import { ROUTE_CACHE_ALL_TAG } from "./create-provider";
import { DEPLOY_MARKER_KEY, withDeployPurge } from "./deploy-purge";
import type { RouteCacheEntry } from "./entry";
import type { RouteCacheStore } from "./store";

type RuntimeCache = ReturnType<typeof getCache>;

/**
 * `getCache()` otherwise hashes keys down to 32 bits before splicing them into a URL path. Two
 * routes colliding there would serve one page's HTML under the other's URL, so keys are
 * percent-encoded instead: lossless, path-safe, and still legible in Vercel's cache observability.
 */
function toRuntimeCache(): RuntimeCache {
  return getCache({ keyHashFunction: encodeURIComponent });
}

/** Entries come back as parsed JSON, so a stored shape from an older release is not to be trusted. */
function isEntry(value: unknown): value is RouteCacheEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { status, headers, body } = value as Partial<RouteCacheEntry>;

  return typeof status === "number" && Array.isArray(headers) && typeof body === "string";
}

/** The marker outlives any single release, so give it the same nominal lifetime as an entry. */
const DEPLOY_MARKER_TTL = 31_536_000;

export function createVercelRuntimeStore(cache: RuntimeCache = toRuntimeCache()): RouteCacheStore {
  return {
    name: "vercel-runtime",
    async get(key) {
      const value = await cache.get(key);

      return isEntry(value) ? value : null;
    },
    async set(key, entry, { ttl, tags }) {
      await cache.set(key, entry, { ttl, tags });
    },
    async expireTag(tags) {
      if (tags.length === 0) {
        return;
      }

      await cache.expireTag(tags);
    },
  };
}

/**
 * The store a Vercel deployment actually runs on: entries in the Runtime Cache, emptied once when a
 * new build first serves. Both halves share one cache handle.
 */
export function createVercelRouteCache(buildId: string): RouteCacheStore {
  const cache = toRuntimeCache();

  return withDeployPurge(createVercelRuntimeStore(cache), {
    buildId,
    readMarker: async () => {
      const value = await cache.get(DEPLOY_MARKER_KEY);

      return typeof value === "string" ? value : null;
    },
    writeMarker: async (id) => {
      await cache.set(DEPLOY_MARKER_KEY, id, { ttl: DEPLOY_MARKER_TTL });
    },
    purge: async () => {
      // The app's own entries. This is the one that has to succeed, so it is not swallowed.
      await cache.expireTag([ROUTE_CACHE_ALL_TAG]);

      // Vercel's own layers for the same tag (CDN and Data cache). The app stores nothing in either
      // today, so a failure here must not keep the release purging on every request.
      try {
        await invalidateByTag(ROUTE_CACHE_ALL_TAG);
      } catch (error) {
        console.error("route-cache: vercel tag invalidation failed", error);
      }
    },
  });
}

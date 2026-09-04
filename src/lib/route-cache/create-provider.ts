// The route cache itself: what may be cached, what is bypassed, gated vs public keying, and tag
// invalidation. Storage and credentials are injected so the policy runs (and is tested)
// identically on a long-lived Node server and on serverless. The deployed wiring is
// ./provider.ts; the design rationale lives there.

import type { CacheOptions, CacheProvider } from "astro";
import { collectInvalidationTags, pathTag } from "astro/cache/provider-utils";
import { entryKey, entryTtl, toEntry, toResponse } from "./entry";
import { isAuthenticatedRequest, shouldBypassCache } from "./rules";
import type { RouteCacheStore } from "./store";

/**
 * Carried by every stored entry, so `invalidate({ tags: [ROUTE_CACHE_ALL_TAG] })` empties the whole
 * cache through the same tag mechanism everything else uses, with no separate "clear" path in the
 * store. It cannot collide with a document tag: those are a `_type`, a `doc:<id>` or a routed uri.
 */
export const ROUTE_CACHE_ALL_TAG = "route-cache:all";

export type RouteCacheDeps = {
  store: RouteCacheStore;
  /** Read lazily per request, so env is resolved at runtime rather than module load. */
  getExpectedAuthorization: () => string | null;
};

export function createRouteCacheProvider({ store, getExpectedAuthorization }: RouteCacheDeps): CacheProvider {
  // `setHeaders` runs inside `onRequest`'s `next()`, against the same Request instance, so the
  // route's own cache options reach the store write without a detour through headers.
  const pendingOptions = new WeakMap<Request, CacheOptions>();

  return {
    name: `route-cache:${store.name}`,
    invalidate: (options) => store.expireTag(collectInvalidationTags(options)),
    setHeaders(options, request) {
      pendingOptions.set(request, options);

      // Nothing cacheable leaves the app; see the header comment.
      return new Headers();
    },
    async onRequest(context, next) {
      const { request, url } = context;

      if (request.method !== "GET" || shouldBypassCache(request)) {
        return next();
      }

      // Gated and public entries live under different keys: a stored gated render must never be
      // readable by a request that has not matched the credentials. A request whose header matches
      // nothing (wrong password, unrelated Bearer token) skips the cache and lets the middleware
      // answer it.
      const gated = isAuthenticatedRequest(request, getExpectedAuthorization());

      if (!gated && request.headers.has("authorization")) {
        return next();
      }

      const key = `${gated ? "gated" : "public"}:${entryKey(url)}`;
      const stored = await store.get(key).catch((error: unknown) => {
        console.error("route-cache: store read failed", error);

        return null;
      });

      if (stored) {
        const hit = toResponse(stored);
        hit.headers.set("X-Astro-Cache", "HIT");

        return hit;
      }

      const response = await next();
      const options = pendingOptions.get(request);
      const ttl = entryTtl(response, options);

      if (ttl === null) {
        return response;
      }

      const entry = await toEntry(response.clone());

      if (entry) {
        await store
          .set(key, entry, { ttl, tags: [...(options?.tags ?? []), pathTag(url.pathname), ROUTE_CACHE_ALL_TAG] })
          .catch((error: unknown) => {
            console.error("route-cache: store write failed", error);
          });
      }

      response.headers.set("X-Astro-Cache", "MISS");

      return response;
    },
  };
}

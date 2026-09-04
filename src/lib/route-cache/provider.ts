// Route cache provider (configured in astro.config.mjs). The cache is answered from inside the
// app: pages are stored in a RouteCacheStore the app reads and writes itself, and no response ever
// carries a header that would let a shared cache downstream hold a copy. That is deliberate:
// invalidation is the /api/revalidate webhook expiring tags in the store, and a copy in a cache the
// webhook cannot reach would outlive every publish. It is also what lets gated (Basic Auth) traffic
// be cached at all, since shared caches refuse requests carrying an `Authorization` header
// (RFC 9111), which on Vercel is what keeps the staging site cacheable.
//
// Cache lookups run before src/middleware.ts, so this is also where draft mode, agent Markdown
// negotiation and Basic Auth are answered for (./rules.ts).
//
// This module only wires runtime env and the host's storage into the policy in
// ./create-provider.ts, which is where the behavior (and its tests) live: it cannot import
// `astro:env` itself and stay testable under the plain Node test runner.

import type { CacheProviderFactory } from "astro";
import { basicAuthorizationHeader } from "~/features/auth/basic-auth";
import { BASIC_AUTH_PASSWORD, BASIC_AUTH_USERNAME, ROUTE_CACHE_VERCEL_RUNTIME } from "~/lib/env";
import { createRouteCacheProvider } from "./create-provider";
import { createMemoryStore, type RouteCacheStore } from "./store";
import { createVercelRouteCache } from "./vercel-store";

let expectedAuthorization: string | null | undefined;

function getExpectedAuthorization(): string | null {
  if (expectedAuthorization === undefined) {
    expectedAuthorization = basicAuthorizationHeader(BASIC_AUTH_USERNAME ?? "", BASIC_AUTH_PASSWORD ?? "");
  }

  return expectedAuthorization;
}

/**
 * With `ROUTE_CACHE_VERCEL_RUNTIME` on, entries go to Vercel's Runtime Cache: shared by every
 * instance, so one webhook call reaches all of them, and emptied once when a new deployment first
 * serves (./deploy-purge.ts). Off (the default), the in-process store keeps the app running
 * unchanged on any other host.
 */
function createStore(): RouteCacheStore {
  return ROUTE_CACHE_VERCEL_RUNTIME ? createVercelRouteCache(__ROUTE_CACHE_BUILD_ID__) : createMemoryStore();
}

const factory: CacheProviderFactory = () => createRouteCacheProvider({ store: createStore(), getExpectedAuthorization });

export default factory;

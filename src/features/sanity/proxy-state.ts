/**
 * Cached Sanity reads for Astro `src/middleware.ts` (Basic Auth, agent Markdown eligibility).
 * Does not import `loadQuery` (route-scoped, cache-tagged).
 *
 * The middleware runs on every request before the route cache, so this module manages
 * its own caching. Each state gets: a live-API read (the API CDN's publish invalidation
 * is unreliable for queries whose result set changes membership; see the strategy note in
 * `~/features/auth/sanity-basic-auth-proxy`), a per-instance hot cache with bounded
 * stale-while-revalidate, and in-flight dedupe. `perspective=published` is pinned:
 * drafts must never flip middleware behavior on the live site.
 */

import { run } from "~/features/utils/common";

/** Per-instance hot cache TTL; no cross-instance invalidation exists, so this caps how long a publish takes to reach every instance. */
const HOT_CACHE_TTL_MS = 5 * 60 * 1000;

/** How long past the TTL the last-known state may still be served while a single refresh round-trip runs. */
const STALE_GRACE_MS = 60 * 1000;

/** A hung fetch would wedge `inflight`, and with it every request past the TTL. */
const FETCH_TIMEOUT_MS = 5 * 1000;

/** Passed in by callers (from `~/lib/env`); `astro:env` cannot be imported here or the module stops being unit-testable. */
export type ProxySanityEnv = {
  projectId: string | undefined;
  dataset: string | undefined;
  apiVersion: string | undefined;
  token: string | undefined;
};

async function sanityFetchJson<T>(query: string, env: ProxySanityEnv): Promise<T> {
  const { projectId, dataset, apiVersion, token } = env;

  if (!projectId || !dataset || !apiVersion || !token) {
    throw new Error("Missing Sanity environment for middleware");
  }

  // Live API endpoint on purpose: apicdn publish invalidation is unreliable for these
  // queries (see the module note above), and the hot cache already caps request volume.
  const url = new URL(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`);
  url.searchParams.set("query", query);
  url.searchParams.set("perspective", "published");
  url.searchParams.set("returnQuery", "false");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Sanity middleware fetch failed: ${res.status}`);
  }

  const body = (await res.json()) as { result: T };
  return body.result;
}

/**
 * Returns a getter that serves `toState(queryResult)` from a per-instance hot cache
 * with bounded stale-while-revalidate and in-flight dedupe (see the module note).
 */
export function createProxySanityState<TPayload, TState>(
  query: string,
  toState: (payload: TPayload) => TState,
  env: ProxySanityEnv
): () => Promise<TState> {
  let hot: { value: TState; freshUntil: number; staleUntil: number } | null = null;
  let inflight: Promise<TState> | null = null;

  return async function getState(): Promise<TState> {
    const now = Date.now();

    if (hot && now < hot.freshUntil) {
      return hot.value;
    }

    if (!inflight) {
      const refresh = run(async () => {
        try {
          const payload = await sanityFetchJson<TPayload>(query, env);
          const value = toState(payload);

          hot = { value, freshUntil: Date.now() + HOT_CACHE_TTL_MS, staleUntil: Date.now() + HOT_CACHE_TTL_MS + STALE_GRACE_MS };

          return value;
        } finally {
          inflight = null;
        }
      });

      // Stale-serving callers below never await this promise; without a handler here a
      // failed background refresh becomes an unhandled rejection.
      refresh.catch(() => {});
      inflight = refresh;
    }

    // Bounded stale-while-revalidate: within the grace window, serve the last-known
    // state and let the refresh land in the background. Past it, fall through and block
    // like a cold start; state older than TTL + grace must not gate requests.
    if (hot && now < hot.staleUntil) {
      return hot.value;
    }

    return inflight;
  };
}

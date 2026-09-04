// Now that entries live in a store that outlives a release, a deploy carrying new markup would
// never reach pages nobody republishes. This closes that: the first request a deployment serves
// purges everything the previous one left behind, which restores the per-deploy freshness the
// in-process store used to give for free while keeping the store shared across instances.
//
// It runs inside the deployment rather than at build time on purpose. A build-time purge completes
// while the previous deployment is still serving, so any page rendered between the purge and the
// alias flip would survive into the new release, which is the staleness being prevented.

import type { RouteCacheStore } from "./store";

/**
 * Records which build last purged. Stored without tags, so a purge by tag cannot take the marker
 * with it and leave every later request purging again.
 */
export const DEPLOY_MARKER_KEY = "route-cache:build";

export type DeployPurgeDeps = {
  /**
   * Identifies the running build (`__ROUTE_CACHE_BUILD_ID__`, baked in by astro.config.mjs); a
   * change from the stored marker is what triggers the purge. A compile-time constant rather than
   * the host's deployment id, which on Vercel is gated behind a project setting and would leave the
   * purge silently disabled when it is off.
   */
  buildId: string;
  readMarker: () => Promise<string | null>;
  writeMarker: (buildId: string) => Promise<void>;
  purge: () => Promise<void>;
};

/**
 * Wraps a store so the first read or write of a new build empties it first. Reads and writes
 * both wait, so a request racing the purge cannot store an entry that the purge then deletes.
 */
export function withDeployPurge(
  store: RouteCacheStore,
  { buildId, readMarker, writeMarker, purge }: DeployPurgeDeps
): RouteCacheStore {
  let pending: Promise<void> | null = null;

  async function purgeIfNewBuild(): Promise<void> {
    if ((await readMarker()) === buildId) {
      return;
    }

    await purge();
    await writeMarker(buildId);
  }

  function ensurePurged(): Promise<void> {
    // One check per instance: the settled promise is kept, so every later request is free. Several
    // instances of the same build can each purge once, which is harmless because expiring a tag
    // twice costs nothing and the second pass only re-renders whatever the first had re-cached.
    if (!pending) {
      pending = purgeIfNewBuild().catch((error: unknown) => {
        console.error("route-cache: deploy purge failed", error);

        // Serving stale markup is the worse outcome, so let the next request try again rather than
        // caching the failure for the life of the instance.
        pending = null;
      });
    }

    return pending;
  }

  return {
    name: store.name,
    async get(key) {
      await ensurePurged();

      return store.get(key);
    },
    async set(key, entry, options) {
      await ensurePurged();

      return store.set(key, entry, options);
    },
    expireTag: (tags) => store.expireTag(tags),
  };
}

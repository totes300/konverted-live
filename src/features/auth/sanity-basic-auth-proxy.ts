/**
 * Sanity query for HTTP Basic Auth toggles, read from Astro `src/middleware.ts`.
 * Credentials come from BASIC_AUTH_USERNAME / BASIC_AUTH_PASSWORD (see `src/lib/env.ts`).
 * Cache mechanics live in `~/features/sanity/proxy-state`; two non-obvious choices:
 *
 * - Uses the live Sanity API, not the API CDN (`apicdn.sanity.io`). CDN publish
 *   invalidation misses cached entries whose result set did not yet contain the
 *   published doc, so a page flipping `passwordProtected` on stayed public for 20+
 *   minutes after publish. A security gate cannot ride on that.
 * - `perspective=published` is pinned: toggling the Studio switch only writes a
 *   draft, and drafts must never flip auth on the live site. Effect on Publish,
 *   within ~5 min (the hot-cache TTL + grace).
 */

import { createProxySanityState } from "~/features/sanity/proxy-state";
import { normalizePathname } from "~/features/utils/pathname";
import { PUBLIC_SANITY_API_VERSION, PUBLIC_SANITY_DATASET, PUBLIC_SANITY_PROJECT_ID, SANITY_API_VIEW_TOKEN } from "~/lib/env";
import { SANITY_SINGLETON_SITE_SETTINGS_ID } from "~/sanity/constants";

type BasicAuthPayload = {
  basicAuth: {
    siteWideEnabled?: boolean | null;
  } | null;
  protectedPaths: string[] | null;
};

// Paths pre-normalized into a Set once per fetch so the per-request check is O(1).
export type BasicAuthState = {
  siteWideEnabled: boolean;
  protectedPathSet: ReadonlySet<string>;
};

function toBasicAuthState(payload: BasicAuthPayload): BasicAuthState {
  return {
    siteWideEnabled: payload.basicAuth?.siteWideEnabled === true,
    protectedPathSet: new Set((payload.protectedPaths ?? []).map(normalizePathname)),
  };
}

// Site-wide protection is a global switch, so it lives on the one `siteSettings` document.
const SANITY_BASIC_AUTH_STATE_QUERY = `{
  "basicAuth": *[_type == "${SANITY_SINGLETON_SITE_SETTINGS_ID}"][0].basicAuth{
    siteWideEnabled
  },
  "protectedPaths": *[passwordProtected == true && defined(uri.current)].uri.current
}`;

export const getSanityBasicAuthState = createProxySanityState(SANITY_BASIC_AUTH_STATE_QUERY, toBasicAuthState, {
  projectId: PUBLIC_SANITY_PROJECT_ID,
  dataset: PUBLIC_SANITY_DATASET,
  apiVersion: PUBLIC_SANITY_API_VERSION,
  token: SANITY_API_VIEW_TOKEN,
});

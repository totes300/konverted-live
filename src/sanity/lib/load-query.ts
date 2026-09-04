// All page content fetches go through here. Draft mode (Presentation tool) uses the "drafts"
// perspective with stega encoding for the overlays; stega is requested per call so it never
// leaks into published HTML.

import type { ClientPerspective, QueryParams } from "@sanity/client";
import { SANITY_API_VIEW_TOKEN } from "~/lib/env";
import { sanityClient } from "./client";

// Cookie holds either "drafts" or a JSON array of Content Release ids.
function parsePerspective(raw: string | undefined): ClientPerspective | undefined {
  if (!raw) {
    return undefined;
  }
  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith("[")) {
    try {
      return JSON.parse(decoded) as ClientPerspective;
    } catch {
      return undefined;
    }
  }
  return decoded as ClientPerspective;
}

export async function loadQuery<QueryResponse>({
  query,
  params,
  perspectiveCookie,
}: {
  query: string;
  params?: QueryParams;
  perspectiveCookie?: string | undefined;
}): Promise<{ data: QueryResponse; perspective: ClientPerspective }> {
  const draftMode = Boolean(perspectiveCookie);

  if (draftMode && !SANITY_API_VIEW_TOKEN) {
    throw new Error("SANITY_API_VIEW_TOKEN is required for Visual Editing (Sanity draft mode).");
  }

  const perspective: ClientPerspective = draftMode ? (parsePerspective(perspectiveCookie) ?? "drafts") : "published";

  // Token applied per request: the SSR boxes supply it via runtime env, and draft reads must auth.
  // Draft reads always hit the live API: editors must never see CDN-stale drafts (dev uses the CDN otherwise).
  let client = SANITY_API_VIEW_TOKEN ? sanityClient.withConfig({ token: SANITY_API_VIEW_TOKEN }) : sanityClient;

  if (draftMode) {
    client = client.withConfig({ useCdn: false });
  }

  const data = await client.fetch<QueryResponse>(query, params ?? {}, { perspective, stega: draftMode });

  return { data, perspective };
}

import type { APIRoute } from "astro";
import { timingSafeEqual } from "~/features/auth/basic-auth";
import { SANITY_REVALIDATE_SECRET } from "~/lib/env";
import { ROUTE_CACHE_ALL_TAG } from "~/lib/route-cache/create-provider";

// Escape hatch: empties the whole route cache in the instance that receives the request.
// Publishing is the normal way to refresh content (see /api/revalidate); this is for the case where
// the cache itself is suspect and you want everything gone without waiting for a redeploy.
//
// It reuses SANITY_REVALIDATE_SECRET rather than adding a second one: both endpoints do exactly the
// same thing, bust cache, so sharing the secret grants no capability its holder does not already
// have through the webhook. Send it as `Authorization: Bearer <secret>`.
//
//   curl -X POST -H "Authorization: Bearer $SANITY_REVALIDATE_SECRET" https://<site>/api/cache-purge
export const prerender = false;

export const POST: APIRoute = async ({ request, cache }) => {
  if (!SANITY_REVALIDATE_SECRET) {
    return Response.json({ ok: false, error: "SANITY_REVALIDATE_SECRET is not set." }, { status: 500 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!timingSafeEqual(provided, SANITY_REVALIDATE_SECRET)) {
    return Response.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }

  await cache.invalidate({ tags: [ROUTE_CACHE_ALL_TAG] });

  return Response.json({ ok: true, purged: "all" });
};

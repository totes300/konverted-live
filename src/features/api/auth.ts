import { PUBLIC_SANITY_STUDIO_BASE_PATH, PUBLIC_SITE_URL } from "~/lib/env";

function getStudioBasePath() {
  const raw = PUBLIC_SANITY_STUDIO_BASE_PATH.trim();
  const withLeading = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeading.replace(/\/$/, "");
}

/**
 * Origins trusted for Studio-triggered API calls: the configured canonical site URL plus the origin
 * the request was actually served on (`x-forwarded-host` behind Vercel, else `host`). Deriving it
 * from the request keeps these endpoints working on every domain one deployment answers to (apex,
 * `www`, `*.vercel.app` preview URLs, localhost) instead of pinning auth to a single env value.
 */
function getTrustedOrigins(request: Request) {
  const origins = new Set<string>();

  try {
    origins.add(new URL(PUBLIC_SITE_URL).origin);
  } catch {
    // Ignore a malformed PUBLIC_SITE_URL; the request-derived origin still applies.
  }

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0]?.trim() ?? "";

  if (host) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const isLocalHost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    origins.add(`${forwardedProto || (isLocalHost ? "http" : "https")}://${host}`);
  }

  return origins;
}

export function isApiAuthorized(request: Request) {
  const trustedOrigins = getTrustedOrigins(request);
  const studioBasePath = getStudioBasePath();

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      const refererUrl = new URL(referer);

      if (trustedOrigins.has(refererUrl.origin) && refererUrl.pathname.startsWith(studioBasePath)) {
        return true;
      }
    } catch {
      // Ignore malformed referer.
    }
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return trustedOrigins.has(origin);
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized", code: "unauthorized", hint: "This endpoint only accepts requests from the Studio." },
    { status: 401 }
  );
}

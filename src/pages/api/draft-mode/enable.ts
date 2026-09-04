import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { APIRoute } from "astro";
import { apiErrorResponse } from "~/features/api/errors";
import { SANITY_API_VIEW_TOKEN } from "~/lib/env";
import { sanityClient } from "../../../sanity/lib/client";

// Presentation-tool handshake: verify the signed secret, set the cookie that flips loadQuery into
// draft mode.
export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const token = SANITY_API_VIEW_TOKEN;
  if (!token) {
    return apiErrorResponse(500, {
      error: "SANITY_API_VIEW_TOKEN is required for live preview.",
      code: "missing_view_token",
      hint: "Set SANITY_API_VIEW_TOKEN in the deployment environment.",
    });
  }

  const {
    isValid,
    redirectTo = "/",
    studioPreviewPerspective,
    // useCdn false: the secret was written moments ago; a CDN-stale read would fail the handshake.
  } = await validatePreviewUrl(sanityClient.withConfig({ token, useCdn: false }), request.url);

  if (!isValid) {
    return apiErrorResponse(401, {
      error: "Invalid preview secret.",
      code: "invalid_preview_secret",
      hint: "Open preview from the Studio's Presentation tool so the URL carries a fresh signed secret.",
    });
  }

  // Same-origin embedded Studio, so the iframe is first-party: SameSite=Lax. httpOnly false so the
  // overlay can rewrite it on a perspective switch.
  cookies.set(perspectiveCookieName, studioPreviewPerspective ?? "drafts", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });

  return redirect(redirectTo, 307);
};

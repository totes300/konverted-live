import type { APIRoute } from "astro";
import { isApiAuthorized, unauthorizedResponse } from "~/features/api/auth";
import { VERCEL_DEPLOY_HOOK_URL } from "~/lib/env";

// Studio-triggered rebuild, behind the Settings "Redeploy site" button. Redirects are baked in at
// build time (astro.config.mjs), so a redirect change needs a new build. The hook URL stays here
// rather than in the Studio bundle: anyone reading that JavaScript could otherwise start builds.
export const prerender = false;

const HOOK_TIMEOUT_MS = 10_000;

export const POST: APIRoute = async ({ request }) => {
  if (!isApiAuthorized(request)) {
    return unauthorizedResponse();
  }

  if (!VERCEL_DEPLOY_HOOK_URL) {
    return Response.json({ ok: false, error: "VERCEL_DEPLOY_HOOK_URL is not set." }, { status: 500 });
  }

  try {
    const res = await fetch(VERCEL_DEPLOY_HOOK_URL, { method: "POST", signal: AbortSignal.timeout(HOOK_TIMEOUT_MS) });

    if (!res.ok) {
      return Response.json({ ok: false, error: `The deploy hook answered ${res.status}.` }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[redeploy] Deploy hook request failed.", error);

    return Response.json({ ok: false, error: "Could not reach the deploy hook." }, { status: 502 });
  }
};

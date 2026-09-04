import { sequence } from "astro:middleware";
import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { MiddlewareHandler } from "astro";
import { AGENT_MARKDOWN_INTERNAL_BASE_PATH, getAgentMarkdownState } from "~/features/agents/markdown-proxy-state";
import { decodeBasicAuthHeader, timingSafeEqual } from "~/features/auth/basic-auth";
import { getSanityBasicAuthState } from "~/features/auth/sanity-basic-auth-proxy";
import { IS_DEV } from "~/features/utils/constants";
import { normalizePathname } from "~/features/utils/pathname";
import { BASIC_AUTH_PASSWORD, BASIC_AUTH_USERNAME, PUBLIC_SANITY_STUDIO_BASE_PATH } from "./lib/env";

// Runtime gates: CMS-managed HTTP Basic Auth and agent content negotiation
// (Markdown-preferring requests are rewritten to the stored agent Markdown).

function unauthorizedResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Protected"',
    },
  });
}

function normalizePublicSanityStudioBasePath(): string {
  const t = PUBLIC_SANITY_STUDIO_BASE_PATH.replace(/\/$/, "");
  return t || "/";
}

function isPublicStudioPath(pathname: string): boolean {
  const base = normalizePublicSanityStudioBasePath();
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isExcludedPath(pathname: string): boolean {
  if (isPublicStudioPath(pathname)) {
    return true;
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/_astro/") || pathname === "/favicon.ico") {
    return true;
  }

  // Paths with a file extension (assets, llms.txt, sitemap.xml) are never gated,
  // matching the source middleware's matcher which skipped all dot-paths.
  return /\.[a-z0-9]+$/i.test(pathname);
}

// True when the client's `Accept` prefers Markdown over HTML (agents; browsers never list it, so they exit fast).
function prefersMarkdown(accept: string | null): boolean {
  if (!accept) {
    return false;
  }

  const lower = accept.toLowerCase();

  if (!lower.includes("markdown")) {
    return false;
  }

  let markdownQ = -1;
  let htmlQ = -1;

  for (const entry of lower.split(",")) {
    const [typeRaw = "", ...paramsRaw] = entry.split(";");
    const type = typeRaw.trim();
    let q = 1;

    for (const param of paramsRaw) {
      const [key, value] = param.split("=");

      if (key?.trim() === "q") {
        const parsed = Number.parseFloat(value ?? "");

        if (!Number.isNaN(parsed)) {
          q = parsed;
        }
      }
    }

    if (type === "text/markdown" || type === "text/x-markdown") {
      markdownQ = Math.max(markdownQ, q);
    } else if (type === "text/html" || type === "application/xhtml+xml") {
      htmlQ = Math.max(htmlQ, q);
    }
  }

  if (markdownQ <= 0) {
    return false;
  }

  return markdownQ >= htmlQ;
}

/**
 * Baseline security headers on every response. No CSP or frame restrictions here: the Studio
 * presentation tool loads the site in an iframe, and third-party origins would need auditing first.
 */
const securityHeaders: MiddlewareHandler = async (_context, next) => {
  const response = await next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
};

const runtimeGates: MiddlewareHandler = async (context, next) => {
  const pathname = context.url.pathname;

  if (isExcludedPath(pathname)) {
    return next();
  }

  // Sanity preview (Presentation tool): the perspective cookie marks an authenticated Studio
  // session, and the Studio itself sits behind Sanity auth. Basic Auth must not run, and draft
  // responses must never enter (or be served from) the route cache.
  if (context.cookies.has(perspectiveCookieName)) {
    context.cache.set(false);
    return next();
  }

  // Agent content negotiation: rewrite eligible Markdown-preferring requests to the Markdown route;
  // the rest (protected, noindex, toggled off) fall through to the HTML + Basic Auth flow below.
  if (context.request.method === "GET" && prefersMarkdown(context.request.headers.get("accept"))) {
    try {
      const { siteWideBasicAuth, excludedPathSet } = await getAgentMarkdownState();

      if (!siteWideBasicAuth && !excludedPathSet.has(normalizePathname(pathname))) {
        return context.rewrite(`${AGENT_MARKDOWN_INTERNAL_BASE_PATH}${pathname === "/" ? "" : pathname}`);
      }
    } catch (error) {
      console.error("middleware: agent markdown state fetch failed", error);
    }
  }

  // The gate is a deploy-time concern, so `astro dev` never runs it: a 401 on localhost only breaks
  // the browser, because Chrome drops URL credentials from subresource requests and the page then
  // renders while all of its client JS 401s. `IS_DEV` is statically false in a build, so no
  // deployment (preview included) can take this path.
  if (IS_DEV) {
    return next();
  }

  // Early exit: if Basic Auth env vars aren't configured, no auth can run.
  // We still check Sanity below to return the 503 explaining the misconfiguration.
  const username = BASIC_AUTH_USERNAME?.trim() ?? "";
  const password = BASIC_AUTH_PASSWORD ?? "";
  const configured = username.length > 0 && password.length > 0;

  // Early exit: a valid Authorization header covers ~all traffic from logged-in users
  // (browsers resend it after the first 401), so skip the Sanity read.
  if (configured) {
    const creds = decodeBasicAuthHeader(context.request.headers.get("authorization"));
    const hasValidCreds = creds && timingSafeEqual(creds.username, username) && timingSafeEqual(creds.password, password);

    if (hasValidCreds) {
      return next();
    }
  }

  try {
    // Cached Sanity read (live API + per-instance SWR hot cache + dedupe).
    const { siteWideEnabled, protectedPathSet } = await getSanityBasicAuthState();

    if (!siteWideEnabled && protectedPathSet.size === 0) {
      return next();
    }

    const needsAuth = siteWideEnabled || protectedPathSet.has(normalizePathname(pathname));

    if (!needsAuth) {
      return next();
    }

    if (!configured) {
      return new Response(
        "Basic Auth is enabled in the CMS but BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD are not set in the deployment environment.",
        { status: 503 }
      );
    }

    // Path requires auth and creds were either missing or invalid (validated above).
    return unauthorizedResponse();
  } catch (error) {
    console.error("middleware: Sanity basic auth fetch failed", error);

    return next();
  }
};

export const onRequest = sequence(securityHeaders, runtimeGates);

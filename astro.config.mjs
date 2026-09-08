import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sanity from "@sanity/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";

const {
  PUBLIC_SITE_URL,
  PUBLIC_SANITY_PROJECT_ID,
  PUBLIC_SANITY_DATASET,
  PUBLIC_SANITY_API_VERSION,
  PUBLIC_SANITY_STUDIO_BASE_PATH,
  // Server-only secret (no PUBLIC_ prefix, so Astro never ships it to the browser).
  // Read/preview token; required for draft-mode live preview and authenticated reads.
  SANITY_API_VIEW_TOKEN,
} = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");

// Public route the embedded Studio mounts at; shared by the integration and robots.
const studioBasePath = PUBLIC_SANITY_STUDIO_BASE_PATH || "/studio";

// Normalized rather than rejected: a trailing slash is a dashboard typo, not a reason to fail a
// deploy. `src/lib/env.ts` cleans the runtime copy the same way; the warning is so the env gets fixed.
const siteUrl = PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

if (PUBLIC_SITE_URL && siteUrl !== PUBLIC_SITE_URL.trim()) {
  console.warn(`[astro.config] PUBLIC_SITE_URL has a trailing slash; using "${siteUrl}". Drop the slash in your env.`);
}

// `astro dev` and every other astro command share `node_modules/.vite`, so a build or a type check
// run while the dev server is up rewrites the exact dep chunks an open tab is holding. The Studio is
// a client-only island, so its 504 shows as a blank page rather than an error: only `dev` keeps the
// default cache, everything else gets its own.
const isDevServer = process.argv[2] === "dev";

// Identifies this build, baked into the bundle below and read by the route cache to empty itself
// once per release (src/lib/route-cache/deploy-purge.ts). A compile-time constant rather than a
// host's deployment id: it cannot be switched off in a dashboard, it works the same on every host,
// and what makes cached HTML stale is the code changing, which is exactly what a new build is.
const buildId = `build_${Date.now().toString(36)}`;

// CMS-managed redirects, fetched once at config load and baked into the build. Fail-soft: a new
// clone without env (or Sanity unreachable) builds with no redirects instead of crashing.
async function fetchRedirects() {
  if (!PUBLIC_SANITY_PROJECT_ID || !PUBLIC_SANITY_DATASET) {
    return {};
  }
  // Redirects are site-wide configuration, so they live on the `siteSettings` document.
  const query = `*[_type == "siteSettings"][0].redirects[defined(coalesce(from, @->from)) && defined(coalesce(to, @->to))]{
    "from": coalesce(from, @->from),
    "to": coalesce(to, @->to),
    "statusCode": coalesce(statusCode, @->statusCode, 301)
  }`;
  const apiVersion = PUBLIC_SANITY_API_VERSION || "2025-02-19";
  const url = new URL(`https://${PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v${apiVersion}/data/query/${PUBLIC_SANITY_DATASET}`);
  url.searchParams.set("query", query);
  url.searchParams.set("perspective", "published");
  try {
    const res = await fetch(url, {
      headers: SANITY_API_VIEW_TOKEN ? { Authorization: `Bearer ${SANITY_API_VIEW_TOKEN}` } : {},
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return {};
    }
    const { result } = await res.json();
    return Object.fromEntries(
      (result ?? []).map(({ from, to, statusCode }) => [from, { destination: to, status: statusCode === 302 ? 302 : 301 }])
    );
  } catch {
    console.warn("[astro.config] Could not fetch redirects from Sanity; building without them.");
    return {};
  }
}

// https://astro.build/config
export default defineConfig({
  // Canonical deployed URL (from PUBLIC_SITE_URL); exposed to components at build time as `Astro.site`.
  site: siteUrl,
  // Always SSR: pages render on demand (so draft mode can read the Presentation cookie), the
  // Studio is embedded at /studio, and /api/* + middleware are live.
  output: "server",
  adapter: vercel(),
  // Tag-based route caching: pages declare maxAge/tags via Astro.cache and the /api/revalidate
  // webhook invalidates by tag on publish. The cache lives entirely in the app
  // (src/lib/route-cache): responses are stored and served in-process and never handed to a host
  // CDN, so the webhook can always reach every copy.
  cache: {
    provider: {
      name: "route-cache",
      entrypoint: new URL("./src/lib/route-cache/provider.ts", import.meta.url),
    },
  },
  redirects: await fetchRedirects(),
  devToolbar: { enabled: false },
  // Single, validated source of truth for env vars. Public vars are readable from
  // `astro:env/client` (and the server); secrets only from `astro:env/server` (importing one in
  // client code is a build error, so secrets can never leak into the browser bundle). Secret
  // server vars are read at runtime, so they honour real process.env on the deploy box and `.env`
  // in dev. App code imports through `src/lib/env.ts`; the Studio (`sanity/*`) keeps
  // `sanity/config.ts` because the Sanity CLI evaluates those files outside Astro where
  // `astro:env` does not exist.
  env: {
    schema: {
      // `url: true` fails the build on a value that is not an absolute URL; a trailing slash is not
      // an error here, `src/lib/env.ts` strips it before anything builds a link.
      PUBLIC_SITE_URL: envField.string({ context: "client", access: "public", url: true }),
      PUBLIC_SANITY_PROJECT_ID: envField.string({ context: "client", access: "public" }),
      PUBLIC_SANITY_DATASET: envField.string({ context: "client", access: "public" }),
      PUBLIC_SANITY_API_VERSION: envField.string({ context: "client", access: "public", default: "2025-02-19" }),
      PUBLIC_SANITY_STUDIO_BASE_PATH: envField.string({ context: "client", access: "public", default: "/studio" }),
      // Umami analytics website id; tracking is disabled when unset.
      PUBLIC_UMAMI_WEBSITE_ID: envField.string({ context: "client", access: "public", optional: true, default: "" }),

      // Required secrets fail the build/dev-start (validateSecrets below). The rest stay
      // optional and their features (email, basic auth, publish webhook) check at use time.
      SANITY_API_VIEW_TOKEN: envField.string({ context: "server", access: "secret", min: 1 }),
      SANITY_API_EDIT_TOKEN: envField.string({ context: "server", access: "secret", min: 1 }),
      RESEND_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      RESEND_EMAIL_FROM: envField.string({ context: "server", access: "secret", optional: true }),
      BASIC_AUTH_USERNAME: envField.string({ context: "server", access: "secret", optional: true }),
      BASIC_AUTH_PASSWORD: envField.string({ context: "server", access: "secret", optional: true }),
      // Optional: only needed when the Sanity publish webhook (/api/revalidate) is wired up.
      // Unset means the endpoint answers 500 and cache invalidation stays manual.
      SANITY_REVALIDATE_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      // Store rendered routes in Vercel's Runtime Cache instead of the in-process one, so the
      // cache is shared by every instance. Not a secret, but it sits with the runtime-read vars on
      // purpose: a public var is inlined at build time, which `vercel deploy --prebuilt` would bake
      // to false from the local machine and silently fall back to the in-process store.
      ROUTE_CACHE_VERCEL_RUNTIME: envField.boolean({ context: "server", access: "secret", default: false }),
    },
    // Validate required secrets at build/dev-start (not just runtime), so a missing one fails fast.
    validateSecrets: true,
  },
  integrations: [
    // Provides `sanity:client` for page fetches; embeds the Studio at /studio.
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      apiVersion: PUBLIC_SANITY_API_VERSION || "2025-02-19",
      useCdn: false, // production baseline; src/sanity/lib/client.ts flips it on in dev (cheap CDN reads)
      // Safe to bake in: no client island imports `sanity:client`, so the token never reaches the browser.
      token: SANITY_API_VIEW_TOKEN || undefined,
      // studioBasePath is what injects /studio. Browser routing so the stega overlay's path-based
      // intent links resolve when the draft page is opened standalone. Relative stega.studioUrl
      // resolves against the server origin; loadQuery enables stega per request, so it never
      // reaches published HTML.
      studioBasePath,
      studioRouterHistory: "browser",
      stega: { studioUrl: studioBasePath },
    }),
    react(), // renderer for the embedded Sanity Studio
  ],
  vite: {
    plugins: [tailwindcss()],
    cacheDir: isDevServer ? "node_modules/.vite" : "node_modules/.vite-build",
    define: { __ROUTE_CACHE_BUILD_ID__: JSON.stringify(buildId) },
    // Every dep Vite discovers after startup rewrites node_modules/.vite/deps, which 504s an open
    // /studio tab ("Outdated Optimize Dep"), so the initial scan has to find all of them.
    optimizeDeps: {
      // Setting `entries` REPLACES Astro's own scan globs, so the app source has to be listed here
      // too or every client dep in src/ is left to runtime discovery.
      entries: ["sanity.config.ts", "src/**/*.{astro,jsx,tsx,vue,svelte,html}"],
      // Injected by <ClientRouter />, so they only exist after transform and no scan can reach them.
      // Everything else the Studio needs comes from the scan; do not pre-empt it here.
      include: [
        "astro/virtual-modules/transitions-router.js",
        "astro/virtual-modules/transitions-types.js",
        "astro/virtual-modules/transitions-events.js",
        "astro/virtual-modules/transitions-swap-functions.js",
        // `zod` is dev-only pre-bundling: the scan reads the file types in `entries`, so the forms' schema
        // chunk (dynamically imported from a .ts element) is never found and 504s at submit.
        "zod",
        // Reached only through raw .tsx source inside @sanity/astro, so the scan never registers
        // it; left unbundled, its CJS lodash deps crash the visual editing island in the browser.
        "@sanity/visual-editing/react",
        // Pinned so a mid-session re-optimization can never drop it: only non-draft pages render
        // the element, and losing the chunk 504s LenisElement after exiting the draft preview.
        "lenis",
      ],
    },
  },
});

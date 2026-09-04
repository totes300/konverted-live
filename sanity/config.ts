/**
 * Configuration seam for the Sanity folder.
 *
 * This is the single place the Sanity schema, structure, actions, and inputs read runtime
 * configuration. It is intentionally self-contained so the folder can be lifted into another
 * project (Vite, Remix, plain `sanity dev`) without editing anything inside it: each setting is
 * looked up across the spellings hosts commonly use, and the host's own one wins.
 *
 * Every `process.env.*` candidate is written out as that exact member expression, never reached
 * through an alias or a computed key. Bundlers expose public env to the browser by replacing that
 * exact text at build (Next.js with `NEXT_PUBLIC_*`, the Sanity CLI with `SANITY_STUDIO_*`), and
 * hand the browser no `process.env` worth enumerating, so an indirect read comes back empty in the
 * one place it matters. The reads sit in thunks so a browser with no `process` at all (Vite hosts,
 * where `import.meta.env` is the real source) fails soft instead of throwing.
 *
 * Keep this module dependency-free (read env only) so nothing outside `sanity/` leaks in.
 */

type Env = Record<string, string | undefined>;

// Cast through `unknown`: a host that types `import.meta.env` narrowly still has to index into it here.
const viteEnv = (import.meta.env ?? {}) as unknown as Env;

/** A guarded `process.env` read; the literal member expression lives at the call site, see above. */
function node(read: () => string | undefined): string | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/** The first candidate carrying a value, so a host only has to satisfy one of the spellings. */
function firstOf(...candidates: (string | undefined)[]): string | undefined {
  return candidates.find((value) => typeof value === "string" && value !== "");
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[sanity/config] Missing required configuration "${name}". Set it or edit sanity/config.ts.`);
  }

  return value;
}

const projectId = firstOf(
  viteEnv.PUBLIC_SANITY_PROJECT_ID,
  node(() => process.env.NEXT_PUBLIC_SANITY_PROJECT_ID),
  node(() => process.env.PUBLIC_SANITY_PROJECT_ID),
  node(() => process.env.SANITY_STUDIO_PROJECT_ID),
  node(() => process.env.SANITY_PROJECT_ID)
);

const dataset = firstOf(
  viteEnv.PUBLIC_SANITY_DATASET,
  node(() => process.env.NEXT_PUBLIC_SANITY_DATASET),
  node(() => process.env.PUBLIC_SANITY_DATASET),
  node(() => process.env.SANITY_STUDIO_DATASET),
  node(() => process.env.SANITY_DATASET)
);

const appUrl = firstOf(
  viteEnv.PUBLIC_SITE_URL,
  node(() => process.env.NEXT_PUBLIC_SITE_URL),
  node(() => process.env.NEXT_PUBLIC_URL),
  node(() => process.env.PUBLIC_SITE_URL),
  node(() => process.env.SANITY_STUDIO_SITE_URL)
);

const apiVersion = firstOf(
  viteEnv.PUBLIC_SANITY_API_VERSION,
  node(() => process.env.NEXT_PUBLIC_SANITY_API_VERSION),
  node(() => process.env.PUBLIC_SANITY_API_VERSION),
  node(() => process.env.SANITY_STUDIO_API_VERSION)
);

/** Public base path the Studio is mounted at (e.g. `/studio`). */
const studioBasePath =
  firstOf(
    viteEnv.PUBLIC_SANITY_STUDIO_BASE_PATH,
    node(() => process.env.NEXT_PUBLIC_SANITY_STUDIO_BASE_PATH),
    node(() => process.env.PUBLIC_SANITY_STUDIO_BASE_PATH),
    node(() => process.env.SANITY_STUDIO_BASE_PATH)
  ) ?? "/studio";

/**
 * A second path the Studio answers on, for a host that also mounts it at a fixed route resolved
 * before page routes. Unset by a host that serves the Studio only at `studioBasePath`.
 */
const studioMountPath = firstOf(
  viteEnv.PUBLIC_SANITY_STUDIO_MOUNT_PATH,
  node(() => process.env.NEXT_PUBLIC_SANITY_STUDIO_MOUNT_PATH),
  node(() => process.env.PUBLIC_SANITY_STUDIO_MOUNT_PATH)
);

export const sanityConfig = {
  /** Sanity project + dataset the Studio and CLI operate on. */
  projectId: required("SANITY_PROJECT_ID", projectId),
  dataset: required("SANITY_DATASET", dataset),

  /** Absolute site URL. Document actions join it to a path, so a trailing slash is stripped here. */
  appUrl: required("SITE_URL", appUrl).trim().replace(/\/+$/, ""),

  /** Sanity API version (YYYY-MM-DD). Used by Studio clients and document type lists. */
  apiVersion: apiVersion ?? "2025-02-19",

  /** Used for reserved-path checks and presentation detection. */
  studioBasePath,

  /**
   * URI paths a routed document may not claim, because the host serves the Studio there and a page
   * at the same path would never be reached.
   */
  reservedStudioPaths: [studioBasePath, studioMountPath].filter((path): path is string => Boolean(path)),

  /**
   * Host endpoints the Studio calls. `draftMode*` are joined to `appUrl`; `seoScreenshot`,
   * `generateLlmsTxt`, and `generatePageMarkdown` are fetched same-origin. A host implements these
   * routes itself; the paths below are what this project serves them at.
   */
  endpoints: {
    draftModeEnable: "/api/draft-mode/enable",
    draftModeDisable: "/api/draft-mode/disable",
    seoScreenshot: "/api/seo-screenshot",
    generateLlmsTxt: "/api/agents/llms-txt",
    generatePageMarkdown: "/api/agents/page-markdown",
    imageAltText: "/api/agents/image-alt-text",
  },
};

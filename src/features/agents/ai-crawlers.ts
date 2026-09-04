/**
 * AI crawler policy: search and citation yes, model training no.
 *
 * Hosting platforms and CDNs increasingly inject their own AI-crawler blocks into `robots.txt` at
 * the edge, so the served policy silently becomes a property of where the site runs rather than of
 * the site itself. Moving hosts, or a vendor changing its managed list, then changes the policy
 * without a commit. Stating it here keeps it in version control and portable.
 *
 * If a platform is also injecting rules, turn that feature off. Two sources for one file is how a
 * policy drifts from what its owner believes it to be.
 */

/**
 * Blocked. These collect content to train or fine-tune models and send no traffic or attribution
 * back. Blocking them costs nothing in search visibility: `Google-Extended` governs Gemini and
 * Vertex grounding, never Google Search or AI Overviews, and `GPTBot` is training-only, separate
 * from the agents ChatGPT actually searches with.
 */
export const AI_TRAINING_CRAWLERS = [
  "Amazonbot",
  "Applebot-Extended",
  "Bytespider",
  "GPTBot",
  "Google-Extended",
  "meta-externalagent",
] as const;

/**
 * Allowed. Answer engines that fetch a page in order to cite it, which is the half of AI traffic
 * worth having. Listed explicitly rather than left to fall through `User-agent: *`, so the intent
 * is recorded and so the group still wins if something upstream merges a broad block into the file.
 *
 * `CCBot` is here deliberately, despite Common Crawl also feeding training corpora: the same
 * archive powers the open web graph that independent link and citation analysis reads, so blocking
 * it mostly costs the ability to measure the site's own reach.
 */
export const AI_CITATION_CRAWLERS = [
  "CCBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "OAI-SearchBot",
  "Perplexity-User",
  "PerplexityBot",
] as const;

/**
 * Content Signals (contentsignals.org) states what may be done with content once it has been
 * crawled, which user-agent groups cannot express: they gate the fetch, not the use. Also an
 * express reservation of rights under Article 4 of EU Directive 2019/790.
 */
export const CONTENT_SIGNAL = "search=yes,ai-train=no,use=reference";

type RobotsGroup = {
  userAgents: readonly string[];
  contentSignal?: string;
  allow?: readonly string[];
  disallow?: readonly string[];
};

/**
 * A crawler obeys only the most specific group matching its name and ignores every other group
 * (RFC 9309). So each named group has to repeat the site's own disallows, or naming an agent would
 * quietly invite it into the paths `*` keeps out.
 */
function renderGroup(group: RobotsGroup): string[] {
  return [
    ...group.userAgents.map((agent) => `User-agent: ${agent}`),
    ...(group.contentSignal ? [`Content-Signal: ${group.contentSignal}`] : []),
    ...(group.allow ?? []).map((path) => `Allow: ${path}`),
    ...(group.disallow ?? []).map((path) => `Disallow: ${path}`),
    "",
  ];
}

/** Full `robots.txt` body. `disallow` holds the site's own private path prefixes. */
export function renderRobotsTxt(options: { disallow: readonly string[]; sitemap: string }): string {
  return [
    "# Search and citation are welcome. Training is not.",
    "# Declared in the codebase so the policy travels with the site, not with the host.",
    "",
    ...renderGroup({
      userAgents: ["*"],
      contentSignal: CONTENT_SIGNAL,
      allow: ["/"],
      disallow: options.disallow,
    }),
    ...renderGroup({ userAgents: AI_CITATION_CRAWLERS, allow: ["/"], disallow: options.disallow }),
    ...renderGroup({ userAgents: AI_TRAINING_CRAWLERS, disallow: ["/"] }),
    `Sitemap: ${options.sitemap}`,
    "",
  ].join("\n");
}

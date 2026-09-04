/**
 * Canonical pathname form shared by `proxy.ts` and the proxy state readers
 * (`~/features/auth/sanity-basic-auth-proxy`, `~/features/agents/markdown-proxy-state`):
 * no trailing slash, `/` stays `/`. Request pathnames and Sanity `uri.current` values
 * must go through the same normalization or set lookups silently miss.
 */
export function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/$/, "");
}

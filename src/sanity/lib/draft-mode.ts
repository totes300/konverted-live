// Draft mode = the Presentation cookie, read only when the page is server-rendered (prerendered
// contexts have no request, and touching Astro.cookies there would warn).

import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { AstroCookies } from "astro";

type DraftContext = { isPrerendered: boolean; cookies: AstroCookies };

export function isDraftMode({ isPrerendered, cookies }: DraftContext): boolean {
  return !isPrerendered && cookies.has(perspectiveCookieName);
}

export function getDraftModeProps(astro: DraftContext) {
  return {
    perspectiveCookie: isDraftMode(astro) ? (astro.cookies.get(perspectiveCookieName)?.value ?? undefined) : undefined,
  };
}

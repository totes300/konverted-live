/**
 * The browser side of the site's own cookies, the announcement dismissal being the first of them.
 * One place so the attributes are a single decision rather than a string copied per feature, and the
 * one place allowed to assign `document.cookie` (`noDocumentCookie` is an error everywhere else).
 *
 * That rule points at the Cookie Store API, which does not fit here. Its reads are async, which the
 * pre-paint guard in the announcement bar cannot wait for, and its writes are async too, so a
 * cookie written on a click the browser is already navigating away from would race the navigation.
 * It is also unavailable outside a secure context, and only Baseline since mid-2025, so older
 * browsers would silently store nothing.
 *
 * Values are written raw, which suits what the site stores (a flag, an id). Anything with a character
 * `document.cookie` treats as a delimiter needs encoding first, or a library.
 */

/** `Secure` is invalid over http, so it is set only where the browser would accept it. */
function attributes(maxAgeSeconds: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  return `Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number) {
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API cannot replace this; see above.
  document.cookie = `${name}=${value}; ${attributes(maxAgeSeconds)}`;
}

/** Presence only: every cookie here is a flag or is read by the server, never read back for its value. */
export function hasCookie(name: string) {
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${name}=`));
}

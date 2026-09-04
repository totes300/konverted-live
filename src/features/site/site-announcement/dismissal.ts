/**
 * Closing the announcement bar is a request to be left alone, so it holds for a day whatever the
 * CMS does in the meantime. The cookie carries no content: rewriting the announcement does not
 * override a visitor who has already dismissed it.
 *
 * Shared by the bar's markup (the inline guard that removes it before the first paint) and its
 * element (which writes the cookie on close).
 */

export const ANNOUNCEMENT_COOKIE_NAME = "announcement_dismissed";

export const ANNOUNCEMENT_COOKIE_MAX_AGE = 60 * 60 * 24;

import { perspectiveCookieName } from "@sanity/preview-url-secret/constants";
import type { APIRoute } from "astro";

// Clears the draft cookie, then returns to ?redirectTo (same-origin paths only) or /.
export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  cookies.delete(perspectiveCookieName, { path: "/" });
  const redirectTo = new URL(request.url).searchParams.get("redirectTo");
  return redirect(redirectTo?.startsWith("/") ? redirectTo : "/", 307);
};

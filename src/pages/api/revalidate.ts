import { assertValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import type { APIRoute } from "astro";
import { docCacheTags } from "~/lib/cache";
import { SANITY_REVALIDATE_SECRET } from "~/lib/env";

// Sanity publish webhook -> cache invalidation. Configure a GROQ-powered webhook in
// https://www.sanity.io/manage with projection `{_id, _type, "uri": uri.current}` on
// create/update/delete, secret SANITY_REVALIDATE_SECRET, URL <site>/api/revalidate.
// Invalidating a document busts its own routes ("doc:<id>", uri) and every route that carries
// its _type tag; publishing the `site` singleton busts the whole site (every page carries 'site').
export const prerender = false;

type WebhookBody = {
  _id?: string;
  _type?: string;
  uri?: string | null;
};

export const POST: APIRoute = async ({ request, cache }) => {
  if (!SANITY_REVALIDATE_SECRET) {
    return Response.json({ ok: false, error: "SANITY_REVALIDATE_SECRET is not set." }, { status: 500 });
  }

  const signature = request.headers.get(SIGNATURE_HEADER_NAME);
  const body = await request.text();

  try {
    await assertValidSignature(body, signature ?? "", SANITY_REVALIDATE_SECRET);
  } catch {
    return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookBody;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload._id || !payload._type) {
    return Response.json({ ok: false, error: "Webhook projection must include _id and _type" }, { status: 400 });
  }

  const tags = docCacheTags({ _id: payload._id, _type: payload._type, uri: payload.uri });

  await cache.invalidate({ tags });

  return Response.json({ ok: true, invalidated: tags });
};

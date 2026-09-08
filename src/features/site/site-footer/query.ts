import { defineQuery } from "groq";
import { SANITY_SINGLETON_SITE_ID } from "~/sanity/constants";

export const SiteFooterQ = defineQuery(`*[_type == "${SANITY_SINGLETON_SITE_ID}"][0]{
  name,
  footer{ tagline }
}`);

/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_SANITY_PROJECT_ID: string;
  readonly PUBLIC_SANITY_DATASET: string;
  readonly PUBLIC_SANITY_API_VERSION: string;
  readonly PUBLIC_SANITY_STUDIO_BASE_PATH: string;
}

/** Baked in by `vite.define` in astro.config.mjs; see the route cache's deploy purge. */
declare const __ROUTE_CACHE_BUILD_ID__: string;

declare global {
  interface HTMLElementTagNameMap {
    "animated-text": import("~/components/AnimatedText/AnimatedTextElement").AnimatedTextElement;
    "modal-dialog": import("~/components/Dialog/DialogElement").DialogElement;
    "author-dialog": import("./features/blog/author/AuthorDialogElement").AuthorDialogElement;
    "lenis-scroll": import("~/components/Lenis/LenisElement").LenisElement;
    "marquee-line": import("~/components/Marquee/MarqueeElement").MarqueeElement;
    "form-field": import("~/components/Form/FormFieldElement").FormFieldElement;
    "site-announcement": import("./features/site/site-announcement/SiteAnnouncementElement").SiteAnnouncementElement;
    "inner-parallax": import("~/components/InnerParallax/InnerParallaxElement") | null;
    "contact-form": import("./features/page-builder/sections/ContactFormSection/ContactFormElement").ContactFormElement;
    "rive-canvas": import("./sanity/media/RiveElement") | null;
  }
}

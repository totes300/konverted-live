import type { ImageFragmentResult } from "~/features/sanity/media/fragment";
import { getImageDimensions } from "~/features/sanity/media/image/dimensions";
import { builder } from "~/features/sanity/media/image/utils";
import type { FaviconFragmentResult } from "~/features/site/seo/fragment";

/**
 * The one icon Google reads. Google Search supports a single favicon per hostname and documents
 * nothing about `media`, so the scheme-qualified links alone would leave the search result icon to
 * undocumented behavior. Serving it from a fixed same-origin path also satisfies Google's "the
 * favicon URL must be stable" rule, which a raw CDN URL breaks every time an editor swaps the asset.
 */
export const FAVICON_ROUTE_PATH = "/favicon.ico";

/** Two of these ship in every page head and browsers draw them at 16-32px, so keep them small. */
export const FAVICON_LINK_PX = 64;

/** Google recommends larger than 48x48px and renders the icon at several sizes, hence a multiple of 48. */
export const FAVICON_ROUTE_PX = 192;

/**
 * Sanity has no ICO output, so the route serves PNG bytes under the `.ico` path. Clients honor the
 * `Content-Type` over the extension, and Google supports any valid favicon format.
 */
export const FAVICON_MIME = "image/png";

/** Exact square crop. The favicon field disables hotspot, so this is always a centered crop. */
export function getFaviconImageSrc(image: ImageFragmentResult, size: number = FAVICON_LINK_PX): string {
  const imageDimensions = getImageDimensions(image, { width: size, height: size });

  return builder
    .withOptions({
      width: imageDimensions.width,
      height: imageDimensions.height,
      fit: "crop",
      format: "png",
      quality: 85,
    })
    .image(image)
    .url();
}

/**
 * What `/favicon.ico` serves: the first variant the editor actually filled in. Light is tried first
 * only because it is the first field in the Site singleton, not because light is preferred.
 */
export function resolveFaviconAsset(favicon: FaviconFragmentResult | null | undefined): ImageFragmentResult | undefined {
  return [favicon?.iconLight, favicon?.iconDark].find((image): image is ImageFragmentResult => image?._id != null);
}

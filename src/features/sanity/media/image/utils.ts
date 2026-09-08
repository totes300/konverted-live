import { createImageUrlBuilder } from "@sanity/image-url";
import { DEFAULT_MAX_HEIGHT, DEFAULT_MAX_WIDTH, DEFAULT_SOURCE_WIDTHS } from "~/features/sanity/media/constants";
import type { ImageFragmentResult } from "~/features/sanity/media/fragment";
import { run } from "~/features/utils/common";
import { type BuilderOptions, getImageDimensions, getSourceWidths } from "./dimensions";

// @see https://github.com/sanity-io/image-url
// Inlined `import.meta.env` reads instead of `~/lib/env`: this module is client-reachable, and
// Vite statically inlines PUBLIC_* vars into client bundles. The `astro:env` schema still
// validates these exist at build time.
export const builder = createImageUrlBuilder({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID as string,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET as string,
});

const defaultBuilderOptions = {
  auto: "format",
  quality: 85,
  maxWidth: DEFAULT_MAX_WIDTH,
  maxHeight: DEFAULT_MAX_HEIGHT,
  sourceWidths: DEFAULT_SOURCE_WIDTHS,
} satisfies BuilderOptions;

function buildImageUrl(image: ImageFragmentResult, options: BuilderOptions = {}) {
  return builder
    .withOptions({ ...defaultBuilderOptions, ...options })
    .image(image)
    .url();
}

export function getLqipBackgroundStyle({ lqip }: ImageFragmentResult) {
  if (!lqip) {
    return null;
  }

  return {
    backgroundImage: `url(${lqip})`,
    backgroundSize: "cover",
  } as const satisfies React.CSSProperties;
}

/** The URL and the size it actually returns, together, so a `srcset` descriptor can never drift from its source. */
function buildSource(image: ImageFragmentResult, options: BuilderOptions = {}) {
  const { width, height, aspectRatio, ...builderOptions } = options;

  const fit = run(() => {
    if (image?.crop) {
      return "crop";
    }

    if (options.fit) {
      return options.fit;
    }

    if ((width && height) || aspectRatio) {
      return "crop";
    }

    return undefined;
  });

  const dimensions = getImageDimensions(image, {
    width,
    height,
    aspectRatio,
  });

  return {
    url: buildImageUrl(image, {
      ...builderOptions,
      fit,
      width: dimensions.width,
      height: dimensions.height,
    }),
    ...dimensions,
  };
}

export function getImageSrc(image: ImageFragmentResult, options: BuilderOptions = {}) {
  return buildSource(image, options).url;
}

export function getImageSrcSet(image: ImageFragmentResult, options: BuilderOptions = {}) {
  const { sourceWidths = DEFAULT_SOURCE_WIDTHS, ...builderOptions } = options;
  const nativeWidth = image.dimensions?.width;

  // If the user chose a specific size or the original image width is smaller than our smallest source,
  // then there is no need to create multiple srcSets. A retina version is enough.
  if (builderOptions.width || builderOptions.height || (nativeWidth && nativeWidth < (sourceWidths[0] as number))) {
    return [2, 3].map((dpr) => `${getImageSrc(image, { ...builderOptions, dpr })} ${dpr}x`).join(", ");
  }

  const entries: string[] = [];
  const claimed = new Set<number>();

  for (const sourceWidth of getSourceWidths(nativeWidth, sourceWidths)) {
    // Explicitly override any custom heights as we are only
    // interested in the width when generating a srcSet entry.
    const source = buildSource(image, { ...builderOptions, height: undefined, width: sourceWidth });

    // The descriptor is the width the CDN returns, not the one we asked for: `maxHeight` shrinks a
    // tall frame, and a candidate claiming more than it delivers outranks the sharper ones below it.
    if (claimed.has(source.width)) {
      continue;
    }

    claimed.add(source.width);
    entries.push(`${source.url} ${source.width}w`);
  }

  return entries.join(", ");
}

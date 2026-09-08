import type { ImageUrlBuilderOptions } from "@sanity/image-url";
import { DEFAULT_MAX_HEIGHT, DEFAULT_MAX_WIDTH, DEFAULT_SOURCE_WIDTHS } from "~/features/sanity/media/constants";
import type { ImageFragmentResult } from "~/features/sanity/media/fragment";
import type { SanityImageCrop } from "~/sanity/types";

// Prefer `width` and `height` over their short versions.
export type BuilderOptions = Omit<ImageUrlBuilderOptions, "w" | "h"> & {
  aspectRatio?: number;
  sourceWidths?: number[];
};

type Dimensions = {
  width?: number;
  height?: number;
};

function calculateDimensions({ width, height }: Dimensions, aspectRatio?: number, fallbackSize?: Dimensions) {
  if (width && height) {
    return { width, height };
  }

  if (width && !height) {
    return aspectRatio ? { width, height: Math.round(width / aspectRatio) } : { width, height: width };
  }

  if (height && !width) {
    return aspectRatio ? { width: Math.round(height * aspectRatio), height } : { width: height, height };
  }

  if (!fallbackSize) {
    throw new Error("Unable to calculate dimensions. Provide a fallbackSize.");
  }

  return calculateDimensions(fallbackSize, aspectRatio);
}

function applyMaxConstraints(
  dimensions: { width: number; height: number },
  opts: { maxWidth?: number; maxHeight?: number } = {}
) {
  const { maxWidth = DEFAULT_MAX_WIDTH, maxHeight = DEFAULT_MAX_HEIGHT } = opts;

  let width = dimensions.width;
  let height = dimensions.height;

  if (maxWidth && width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }

  if (maxHeight && height > maxHeight) {
    const ratio = maxHeight / height;
    height = maxHeight;
    width = Math.round(width * ratio);
  }

  return { width, height };
}

function getEffectiveDimensions(dimensions: Dimensions, opts: { crop?: SanityImageCrop | null } = {}) {
  const { crop } = opts;
  const { width: intrinsicWidth, height: intrinsicHeight } = dimensions;

  if (!intrinsicWidth || !intrinsicHeight) {
    return { width: undefined, height: undefined };
  }

  if (!crop) {
    return { width: intrinsicWidth, height: intrinsicHeight };
  }

  const { left = 0, top = 0, right = 0, bottom = 0 } = crop;
  const cropWidth = intrinsicWidth - left * intrinsicWidth - right * intrinsicWidth;
  const cropHeight = intrinsicHeight - top * intrinsicHeight - bottom * intrinsicHeight;

  return {
    width: cropWidth > 0 ? cropWidth : intrinsicWidth,
    height: cropHeight > 0 ? cropHeight : intrinsicHeight,
  };
}

function getImageAspectRatio(image: ImageFragmentResult, opts: { crop?: SanityImageCrop | null } = {}) {
  if (!image.dimensions) {
    throw new Error("Dimensions are missing");
  }

  const { width, height } = getEffectiveDimensions(image.dimensions, opts);
  return width && height ? width / height : undefined;
}

function calculateImageDimensions(
  image: ImageFragmentResult,
  opts: { width?: number; height?: number; aspectRatio?: number; crop?: SanityImageCrop | null } = {}
) {
  const { crop, aspectRatio, height, width } = opts;

  const imageAR = getImageAspectRatio(image, { crop });
  const effectiveAR = aspectRatio ?? imageAR;

  // Ensure that we are not up scaling a small image.
  const upperBound = image.dimensions?.width ?? Number.POSITIVE_INFINITY;
  const widestSource = DEFAULT_SOURCE_WIDTHS[DEFAULT_SOURCE_WIDTHS.length - 1] as number;
  const maxWidth = Math.min(widestSource, upperBound);

  return calculateDimensions({ width, height }, effectiveAR, {
    width: maxWidth,
  });
}

export function getImageDimensions(image: ImageFragmentResult, options: BuilderOptions = {}) {
  const { width, height, aspectRatio, maxWidth, maxHeight } = options;

  const rawDimensions = calculateImageDimensions(image, {
    width,
    height,
    aspectRatio,
    crop: image.crop,
  });

  return applyMaxConstraints(rawDimensions, {
    maxWidth,
    maxHeight,
  });
}

/**
 * The widths a `srcset` offers for one image: the standard ladder, cut where the source runs out and
 * capped off with the source's own width, so a frame that sits between two rungs still offers all it has.
 */
export function getSourceWidths(nativeWidth: number | undefined, sourceWidths: number[] = DEFAULT_SOURCE_WIDTHS) {
  if (!nativeWidth) {
    return sourceWidths;
  }

  return [...sourceWidths.filter((sourceWidth) => sourceWidth < nativeWidth), nativeWidth];
}

import assert from "node:assert/strict";
import { test } from "node:test";
import type { ImageFragmentResult } from "~/features/sanity/media/fragment";
import { getImageDimensions, getSourceWidths } from "./dimensions";

const imageOf = (width: number, height: number, crop?: ImageFragmentResult["crop"]): ImageFragmentResult => ({
  _id: "image-test",
  dimensions: { _type: "sanity.imageDimensions", width, height, aspectRatio: width / height },
  crop,
});

test("a landscape frame is delivered at the width it was asked for", () => {
  assert.deepEqual(getImageDimensions(imageOf(2880, 1840), { width: 2048 }), { width: 2048, height: 1308 });
  assert.deepEqual(getImageDimensions(imageOf(2880, 1840), { width: 2560 }), { width: 2560, height: 1636 });
});

test("a portrait frame is delivered at the width it was asked for", () => {
  // The regression: `maxHeight` used to bite at 2048 and hand back a 1539-wide image under a 2048w
  // descriptor, so the browser picked a candidate that was softer than every number it was shown.
  assert.deepEqual(getImageDimensions(imageOf(2800, 3726), { width: 2048 }), { width: 2048, height: 2725 });
  assert.deepEqual(getImageDimensions(imageOf(2800, 3726), { width: 2560 }), { width: 2560, height: 3407 });
});

test("maxHeight still catches a frame tall enough to be pathological", () => {
  assert.deepEqual(getImageDimensions(imageOf(1000, 3000), { width: 2048 }), { width: 1365, height: 4096 });
});

test("maxWidth caps a frame asked for wider than the ceiling", () => {
  assert.deepEqual(getImageDimensions(imageOf(5000, 2000), { width: 4000 }), { width: 3072, height: 1229 });
});

test("with no size asked for, a frame falls back to its own width, never upscaled", () => {
  assert.deepEqual(getImageDimensions(imageOf(2800, 1680), {}), { width: 2800, height: 1680 });
  assert.deepEqual(getImageDimensions(imageOf(4000, 2400), {}), { width: 3072, height: 1843 });
});

test("a crop sets the proportions the height is derived from", () => {
  const cropped = imageOf(2000, 1000, { _type: "sanity.imageCrop", left: 0.25, right: 0.25, top: 0, bottom: 0 });
  assert.deepEqual(getImageDimensions(cropped, { width: 800 }), { width: 800, height: 800 });
});

test("an explicit aspectRatio wins over the image's own", () => {
  assert.deepEqual(getImageDimensions(imageOf(2800, 3726), { width: 1440, aspectRatio: 16 / 9 }), { width: 1440, height: 810 });
});

test("the source ladder is cut where the image runs out and topped with its own width", () => {
  // A 1376-wide export used to stop at the 1024 rung, because 1440 would have been an upscale, so
  // a third of the pixels it actually had were never offered.
  assert.deepEqual(getSourceWidths(1376), [600, 1024, 1376]);
  assert.deepEqual(getSourceWidths(2800), [600, 1024, 1440, 2048, 2560, 2800]);
  assert.deepEqual(getSourceWidths(2048), [600, 1024, 1440, 2048]);
  assert.deepEqual(getSourceWidths(undefined), [600, 1024, 1440, 2048, 2560, 3072]);
});

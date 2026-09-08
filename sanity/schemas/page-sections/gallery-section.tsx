import { defineField } from "sanity";

export const gallerySection = defineField({
  type: "object",
  name: "gallerySection",
  title: "Gallery",
  icon: () => <>🖼️</>,
  fields: [
    defineField({
      name: "images",
      type: "array",
      title: "Images",
      description: "Up to 10 frames. The section cycles through them continuously while it is on screen.",
      of: [{ type: "image", options: { hotspot: true } }],
      validation: (R) => R.required().min(1).max(10),
    }),
    defineField({
      name: "cycleMs",
      type: "number",
      title: "Cycle speed (ms)",
      description: "Milliseconds each frame stays on screen before the hard cut. 400 matches the reference motion.",
      initialValue: 400,
      validation: (R) => R.min(100).max(5000),
    }),
  ],
  preview: {
    // One path only: `images.0` alongside `images` makes Sanity drop the parent, and the count reads 0.
    select: {
      images: "images",
    },
    prepare({ images }) {
      const frames = Array.isArray(images) ? images : [];
      return {
        title: `Gallery (${frames.length} image${frames.length === 1 ? "" : "s"})`,
        subtitle: "Gallery",
        media: frames[0],
      };
    },
  },
});

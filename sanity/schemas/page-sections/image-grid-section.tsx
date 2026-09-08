import { defineArrayMember, defineField } from "sanity";
import { ImageGridItemInput } from "../../inputs/image-grid-item-input";

export const imageGridSection = defineField({
  type: "object",
  name: "imageGridSection",
  title: "Image grid",
  icon: () => <>🧱</>,
  fields: [
    defineField({
      name: "images",
      type: "array",
      title: "Images",
      description:
        "Drop the whole set in at once, then set each frame's width and pick the ones the work grid card cycles through. Every frame renders here; a case study's cover and card image are their own fields.",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          components: { item: ImageGridItemInput },
          fields: [
            defineField({
              name: "width",
              type: "string",
              title: "Width",
              initialValue: "full",
              description: "Half-row frames pair up side by side from the large breakpoint. One column below it either way.",
              options: {
                layout: "radio",
                direction: "horizontal",
                list: [
                  { title: "Full row", value: "full" },
                  { title: "Half row", value: "half" },
                ],
              },
            }),
            defineField({
              name: "showInCard",
              type: "boolean",
              title: "Show in the work grid card",
              initialValue: false,
              description:
                "Adds this frame to the card's hover cycle on the work grid, after the card's own image. The card crops to 16/9 or 6/5, so a landscape frame reads best.",
              options: { layout: "switch" },
            }),
          ],
        }),
      ],
      validation: (R) => R.required().min(1).max(40),
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
        title: `${frames.length} image${frames.length === 1 ? "" : "s"}`,
        subtitle: "Image grid",
        media: frames[0],
      };
    },
  },
});

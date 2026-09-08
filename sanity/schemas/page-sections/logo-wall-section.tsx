import { defineArrayMember, defineField } from "sanity";

export const logoWallSection = defineField({
  type: "object",
  name: "logoWallSection",
  title: "Logo wall",
  icon: () => <>🏷️</>,
  fields: [
    defineField({
      name: "metric",
      type: "string",
      title: "Metric",
      description: "The number that opens the sentence, e.g. “300+”. Rendered in accent. Leave empty for a plain sentence.",
      initialValue: "300+",
    }),
    defineField({
      name: "statement",
      type: "text",
      title: "Statement",
      rows: 2,
      description: "The rest of the trust line, continuing straight after the metric. Keep it to one sentence.",
      initialValue: "websites shipped worldwide, for teams whose site has to move as fast as their ideas.",
    }),
    defineField({
      name: "logos",
      type: "array",
      title: "Logos",
      description:
        "The order here is the order they appear in and cycle through. The wall shows six at a time (eight from large screens up); anything beyond that rotates in.",
      of: [
        defineArrayMember({
          type: "object",
          name: "logo",
          fields: [
            defineField({
              name: "image",
              type: "image",
              title: "Logo",
              description:
                "SVG, or a PNG with a transparent background. The shape is re-coloured to the site's ink, so the file's own colours are ignored.",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "name",
              type: "string",
              title: "Client name",
              description: "Read out to screen readers in place of the logo.",
              validation: (R) => R.required(),
            }),
          ],
          preview: {
            select: { title: "name", media: "image" },
          },
        }),
      ],
      validation: (R) => R.required().min(1).max(24),
    }),
    defineField({
      name: "swapMs",
      type: "number",
      title: "Swap interval (ms)",
      description: "Milliseconds between two logo swaps. Only matters when there are more logos than slots.",
      initialValue: 1500,
      validation: (R) => R.min(500).max(10000),
    }),
  ],
  preview: {
    select: {
      statement: "statement",
      metric: "metric",
      logos: "logos",
      media: "logos.0.image",
    },
    prepare({ statement, metric, logos, media }) {
      const count = Array.isArray(logos) ? logos.length : 0;
      return {
        title: [metric, statement].filter(Boolean).join(" ") || "Logo wall",
        subtitle: `Logo wall: ${count} logo${count === 1 ? "" : "s"}`,
        media,
      };
    },
  },
});

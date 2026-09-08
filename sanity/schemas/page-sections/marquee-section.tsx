import { defineField } from "sanity";

export const marqueeSection = defineField({
  type: "object",
  name: "marqueeSection",
  title: "Marquee",
  icon: () => <>🎞️</>,
  fields: [
    defineField({
      name: "headline",
      type: "string",
      title: "Headline",
      description:
        "The strip's words, e.g. “Selected Works”. Rendered uppercase, each word separated by the morphing webOS mark.",
      initialValue: "Selected Works",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "statement",
      type: "text",
      title: "Statement",
      rows: 2,
      description: "The display line under the strip, centred. Set in the serif accent face, so keep it to a few words.",
      initialValue: "If you can think it, your team can ship it",
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 3,
      description: "Short supporting copy under the statement.",
      initialValue:
        "Each of these brands came through branding, web design and agentic development with us. Their marketing teams now edit and extend the site themselves through webOS — shipping at the speed their ideas arrive.",
    }),
  ],
  preview: {
    select: {
      title: "headline",
    },
    prepare({ title }) {
      return {
        title: title ?? "Marquee",
        subtitle: "Marquee",
      };
    },
  },
});

import { defineArrayMember, defineField } from "sanity";

export const solutionSection = defineField({
  type: "object",
  name: "solutionSection",
  title: "Solution",
  icon: () => <>🧩</>,
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description: "Short section label above the rule, e.g. “The solution”. Rendered uppercase in accent as ( LABEL ).",
      initialValue: "The solution",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "headline",
      type: "text",
      title: "Headline",
      rows: 2,
      description: "The large serif section title. A line break here is kept on desktop.",
      initialValue: "We make your brand ready\nto win in the agentic era",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "underline",
      type: "string",
      title: "Underlined phrase",
      description: "An exact phrase from the headline to mark with the hand-drawn underline, e.g. “to win”.",
      initialValue: "to win",
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 3,
      description: "Supporting copy under the headline.",
      initialValue:
        "We shape the strategy and messaging, create a distinctive brand and conversion-focused web design, then build it into a fast, modular website powered by WebOS - ready for your team to edit, extend and grow with AI.",
    }),
    defineField({
      name: "items",
      type: "array",
      title: "Pillars",
      description: "The numbered columns; numbering comes from the order here.",
      of: [
        defineArrayMember({
          type: "object",
          name: "solutionItem",
          fields: [
            defineField({
              name: "title",
              type: "string",
              title: "Title",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "text",
              type: "text",
              title: "Text",
              rows: 4,
              validation: (R) => R.required(),
            }),
            defineField({
              name: "image",
              type: "image",
              title: "Image",
              options: { hotspot: true },
              description: "The column's visual. Until one is set, the section shows the stage as an empty surface.",
            }),
          ],
          preview: {
            select: { title: "title", media: "image" },
          },
        }),
      ],
      validation: (R) => R.required().min(1).max(4),
    }),
  ],
  preview: {
    select: {
      title: "headline",
      subtitle: "eyebrow",
    },
    prepare({ title, subtitle }) {
      return {
        title: title ?? "Solution",
        subtitle: subtitle ? `Solution — ${subtitle}` : "Solution",
      };
    },
  },
});

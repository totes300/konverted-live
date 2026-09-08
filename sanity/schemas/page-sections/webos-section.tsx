import { defineArrayMember, defineField } from "sanity";

export const webosSection = defineField({
  type: "object",
  name: "webosSection",
  title: "WebOS",
  icon: () => <>🧠</>,
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description: "Short section label above the rule, e.g. “Introducing WebOS”. Rendered uppercase in accent as ( LABEL ).",
      initialValue: "Introducing WebOS",
    }),
    defineField({
      name: "headline",
      type: "text",
      title: "Headline",
      rows: 2,
      description: "The centered display title. Keep it short; a line break here is kept on desktop.",
      initialValue: "Manage your website with AI, without going off brand",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "underline",
      type: "string",
      title: "Underlined phrase",
      description:
        "An exact phrase from the headline to mark with the hand-drawn underline, e.g. “going off brand”. The phrase never breaks across lines, so it also pins the last line.",
      initialValue: "going off brand",
    }),
    defineField({
      name: "body",
      type: "text",
      title: "Body",
      rows: 5,
      description: "The explanation under the headline, two or three sentences: what WebOS is and what the team gets.",
      initialValue:
        "Every site we build comes with WebOS, an AI‑ready manual of your brand: the positioning, voice, design rules and page components an AI agent needs to work on your website. Your team asks for a new page or a change in plain language, and the result stays on brand, with no designer or developer ticket.",
    }),
    defineField({
      name: "items",
      type: "array",
      title: "Steps",
      description: "The numbered columns under the diagram; numbering comes from the order here.",
      of: [
        defineArrayMember({
          type: "object",
          name: "webosItem",
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
          ],
          preview: {
            select: { title: "title" },
          },
        }),
      ],
      validation: (R) => R.required().min(1).max(4),
    }),
  ],
  preview: {
    select: {
      title: "headline",
    },
    prepare({ title }) {
      return {
        title: title ?? "WebOS",
        subtitle: "WebOS",
      };
    },
  },
});

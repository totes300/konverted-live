import { defineField } from "sanity";

export const heroSection = defineField({
  type: "object",
  name: "heroSection",
  title: "Hero",
  icon: () => <>🟠</>,
  fields: [
    defineField({
      name: "headline",
      type: "string",
      title: "Headline",
      description: "The display line. Rendered as the page H1.",
      initialValue: "Strategic websites built for an agentic world.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "highlight",
      type: "string",
      title: "Encircled word",
      description:
        "The word of the headline that gets the hand-drawn circle, e.g. “agentic”. One short word reads best; leave empty for no circle.",
      initialValue: "agentic",
      validation: (R) =>
        R.custom((value, context) => {
          const headline = (context.parent as { headline?: string } | undefined)?.headline;

          if (!value || !headline || headline.includes(value)) {
            return true;
          }

          return "The encircled word has to appear in the headline word for word.";
        }),
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 3,
      description: "Short supporting copy, placed to the right of the headline on desktop.",
      initialValue: "Konverted is a global branding and digital design agency building B2B websites for the agentic era.",
    }),
  ],
  preview: {
    select: {
      title: "headline",
    },
    prepare({ title }) {
      return {
        title: title ?? "Hero",
        subtitle: "Hero",
      };
    },
  },
});

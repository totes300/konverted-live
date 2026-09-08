import { defineField } from "sanity";

export const intersectionSection = defineField({
  type: "object",
  name: "intersectionSection",
  title: "Intersection",
  icon: () => <>◑</>,
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description: "Short section label above the rule, e.g. “We are different”. Rendered uppercase in accent as ( LABEL ).",
      initialValue: "We are different",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "headline",
      type: "text",
      title: "Headline",
      rows: 2,
      description:
        "The large serif section title. It sets beside the diagram, so it wraps on its own rather than on authored breaks.",
      initialValue: "We operate at the intersect of business and creativity",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 3,
      description: "Supporting copy under the headline, set beside the arrow.",
      initialValue:
        "We're creatives, technologists and entrepreneurs, so we understand both the technical and business challenges of building digital success stories.",
    }),
    defineField({
      name: "leftLabel",
      type: "string",
      title: "Left circle",
      description: "The label inside the left circle of the diagram.",
      initialValue: "Business",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "rightLabel",
      type: "string",
      title: "Right circle",
      description: "The label inside the right circle of the diagram.",
      initialValue: "Creativity",
      validation: (R) => R.required(),
    }),
  ],
  preview: {
    select: {
      title: "headline",
      subtitle: "eyebrow",
    },
    prepare({ title, subtitle }) {
      return {
        title: title ?? "Intersection",
        subtitle: subtitle ? `Intersection: ${subtitle}` : "Intersection",
      };
    },
  },
});

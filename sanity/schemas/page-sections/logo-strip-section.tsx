import { defineArrayMember, defineField } from "sanity";
import { SANITY_CASE_STUDY_DOCUMENT_TYPE } from "../../constants";

export const logoStripSection = defineField({
  type: "object",
  name: "logoStripSection",
  title: "Logo strip",
  icon: () => <>🏛️</>,
  fields: [
    defineField({
      name: "statement",
      type: "string",
      title: "Statement",
      description:
        "The trust line beside the logos. One short sentence, and let it carry a number: “More than 500 B2B clients since 2016” is proof, “trusted by great teams” is not.",
      initialValue: "More than 500 B2B clients since 2016",
      validation: (R) => R.required().max(64),
    }),
    defineField({
      name: "logos",
      type: "array",
      title: "Logos",
      description:
        "The order here is the order they run past in. The strip loops, so it never runs out; six to twelve of the most recognisable names beats a full client list.",
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
            defineField({
              name: "caseStudy",
              type: "reference",
              title: "Case study",
              description: "Optional. Links the logo to the project, so a recognised name becomes a way into the work.",
              to: [{ type: SANITY_CASE_STUDY_DOCUMENT_TYPE }],
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "caseStudy.title", media: "image" },
          },
        }),
      ],
      validation: (R) => R.required().min(3).max(30),
    }),
  ],
  preview: {
    select: {
      statement: "statement",
      logos: "logos",
      media: "logos.0.image",
    },
    prepare({ statement, logos, media }) {
      const count = Array.isArray(logos) ? logos.length : 0;

      return {
        title: statement || "Logo strip",
        subtitle: `Logo strip — ${count} logo${count === 1 ? "" : "s"}`,
        media,
      };
    },
  },
});

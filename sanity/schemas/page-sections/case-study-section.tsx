import { defineArrayMember, defineField } from "sanity";
import { uniqueReferenceArray } from "../../utils";
import { createLinkField } from "../fields/create-link";

const uniqueCaseStudies = uniqueReferenceArray({
  arrayKey: "caseStudies",
  message: "Each case study can only be listed once. Remove duplicate selections.",
});

export const caseStudySection = defineField({
  type: "object",
  name: "caseStudySection",
  title: "Case Studies",
  icon: () => <>🏆</>,
  fields: [
    defineField({
      name: "label",
      type: "string",
      title: "Label",
      description: "The small marker on the left of the header rail.",
      initialValue: "Projects",
    }),
    defineField({
      name: "title",
      type: "string",
      title: "Title",
      description: "The display title above the grid, set one word per line — so keep it to two or three words.",
      initialValue: "Featured work",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "code",
      type: "string",
      title: "Catalogue code",
      description: "The short code stamped beside the mark, e.g. KV. The project count is added automatically.",
      initialValue: "KV",
    }),
    defineField({
      name: "services",
      type: "array",
      title: "Services",
      description: "The disciplines this work ran through. Listed slash-separated in the middle of the header rail.",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    createLinkField({
      title: "Link",
      description: "The way out to the full list, on the right of the header rail.",
    }),
    defineField({
      name: "caseStudies",
      type: "array",
      title: "Case studies",
      description:
        "Drag to set the order. Each case study brings its own card — how wide it runs and what plays on hover are set on the case study itself.",
      of: [
        defineArrayMember({
          type: "reference",
          title: "Case study",
          to: [{ type: "caseStudy", validation: (R) => R.required() }],
          options: { filter: uniqueCaseStudies.filter },
        }),
      ],
      validation: (R) => uniqueCaseStudies.validation(R).min(1),
    }),
  ],
  preview: {
    select: {
      title: "title",
      caseStudies: "caseStudies",
    },
    prepare({ title, caseStudies }) {
      const count = Array.isArray(caseStudies) ? caseStudies.length : 0;

      return {
        title: title ?? "Case Studies",
        subtitle: `Case Studies — ${count} listed`,
      };
    },
  },
});

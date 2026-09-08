import { defineField, defineType } from "sanity";

// Written only by the lead form endpoint; the fields mirror what the homepage form asks. Editors read
// submissions here, never author them.
export const leadFormSubmission = defineType({
  __experimental_formPreviewTitle: false,
  name: "leadFormSubmission",
  type: "document",
  readOnly: true,
  icon: () => <>📅</>,
  fields: [
    defineField({
      name: "name",
      type: "string",
    }),
    defineField({
      name: "email",
      type: "string",
    }),
    defineField({
      name: "companyUrl",
      title: "Company website",
      type: "string",
    }),
    defineField({
      name: "need",
      type: "string",
    }),
    defineField({
      name: "message",
      type: "text",
      rows: 5,
    }),
    defineField({
      name: "consent",
      type: "boolean",
      description: "Whether the consent box was ticked at submit.",
    }),
  ],
  preview: {
    select: {
      name: "name",
      email: "email",
      createdAt: "_createdAt",
    },
    prepare: ({ name, email, createdAt }) => {
      return {
        title: [name, email].filter(Boolean).join(" — "),
        subtitle: createdAt,
      };
    },
  },
});

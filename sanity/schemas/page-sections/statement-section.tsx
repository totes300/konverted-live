import { defineField } from "sanity";

export const statementSection = defineField({
  type: "object",
  name: "statementSection",
  title: "Statement",
  icon: () => <>💬</>,
  fields: [
    defineField({
      name: "headline",
      type: "string",
      title: "Eyebrow",
      description: "Short section label, e.g. “About you”. Rendered uppercase in accent as ( LABEL ).",
      initialValue: "About you",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "statement",
      type: "text",
      title: "Statement",
      rows: 3,
      description: "The lead sentences, set in dark ink.",
      initialValue:
        "A new era has begun. Websites are no longer static assets. Visitors are no longer just human. The agentic web demands a shift.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "support",
      type: "text",
      title: "Support",
      rows: 4,
      description: "The continuation, set in muted ink. Flows inline after the statement.",
      initialValue:
        "Konverted is an AI-native digital agency built for the next era. We create distinctive brands and AI-native websites — then give your website a second brain with our proprietary WebOS, so your marketing team can ship at the speed of their ideas.",
    }),
  ],
  preview: {
    select: {
      title: "statement",
      subtitle: "headline",
    },
    prepare({ title, subtitle }) {
      return {
        title: title ?? "Statement",
        subtitle: subtitle ? `Statement — ${subtitle}` : "Statement",
      };
    },
  },
});

import { defineArrayMember, defineField } from "sanity";

const stepIcons = [
  { title: "Spark", value: "sparkle" },
  { title: "WebOS mark", value: "webos-pixel" },
  { title: "Brand system", value: "webos-brand" },
  { title: "Arrow", value: "arrow-up-right" },
];

export const processSection = defineField({
  type: "object",
  name: "processSection",
  title: "Process",
  icon: () => <>⏱️</>,
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description: "Short section label above the rule. Rendered uppercase in accent as ( LABEL ).",
      initialValue: "The shift",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "headline",
      type: "text",
      title: "Headline",
      rows: 2,
      initialValue: "Ship on-brand website edits at the speed of your ideas.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "underline",
      type: "string",
      title: "Underlined phrase",
      description: "An exact phrase from the headline to mark with the hand-drawn underline, e.g. “your ideas”.",
      initialValue: "your ideas",
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 4,
      description: "The paragraph beside the headline.",
      initialValue:
        "Your marketing team connects an LLM straight to the site and starts prompting. By the end of the day there is a finished landing page or campaign page, whatever they thought of that morning, built out of your own brand system rather than a generic AI layout.",
    }),
    defineField({
      name: "timelineLabel",
      type: "string",
      title: "Ruler label",
      initialValue: "Timeline",
    }),
    defineField({
      name: "oldTitle",
      type: "string",
      title: "Old lane title",
      initialValue: "The old way",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "oldCaption",
      type: "string",
      title: "Old lane caption",
      initialValue: "Eight days, and six hand-offs",
    }),
    defineField({
      name: "oldSteps",
      type: "array",
      title: "Old lane steps",
      description:
        "Each step's duration is its width on the ruler, so the lane's total is the sum of these days. Keep that sum at eight or under; past that the lane stops being readable.",
      of: [
        defineArrayMember({
          type: "object",
          name: "processStep",
          fields: [
            defineField({ name: "label", type: "string", title: "Label", validation: (R) => R.required() }),
            defineField({
              name: "days",
              type: "number",
              title: "Days",
              initialValue: 1,
              validation: (R) => R.required().integer().min(1).max(5),
            }),
          ],
          preview: {
            select: { title: "label", days: "days" },
            prepare({ title, days }) {
              return { title, subtitle: days === 1 ? "1 day" : `${days} days` };
            },
          },
        }),
      ],
      validation: (R) => R.required().min(2).max(8),
    }),
    defineField({
      name: "newTitle",
      type: "string",
      title: "New lane title",
      initialValue: "With WebOS",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "newCaption",
      type: "string",
      title: "New lane caption",
      initialValue: "Idea to live in a single day",
    }),
    defineField({
      name: "newLabel",
      type: "string",
      title: "New lane block label",
      description: "The label inside the accent block that occupies the single day.",
      initialValue: "WebOS",
    }),
    defineField({
      name: "newSteps",
      type: "array",
      title: "New lane steps",
      description: "The hours inside that one day. They ride a connector rail rather than boxes, so they carry no duration.",
      of: [
        defineArrayMember({
          type: "object",
          name: "processFlowStep",
          fields: [
            defineField({ name: "label", type: "string", title: "Label", validation: (R) => R.required() }),
            defineField({
              name: "icon",
              type: "string",
              title: "Icon",
              options: { list: stepIcons, layout: "dropdown" },
              initialValue: "sparkle",
              validation: (R) => R.required(),
            }),
            defineField({
              name: "isFinal",
              type: "boolean",
              title: "Final step",
              description: "The arrival step, painted in the accent rather than the tint.",
              initialValue: false,
            }),
            defineField({
              name: "showOnMobile",
              type: "boolean",
              title: "Show on mobile",
              description: "The four steps stay on one line on a phone, so a step that only refines the one before it comes off.",
              initialValue: true,
            }),
          ],
          preview: {
            select: { title: "label", subtitle: "icon" },
          },
        }),
      ],
      validation: (R) => R.required().min(2).max(4),
    }),
    defineField({
      name: "closingTitle",
      type: "string",
      title: "Closing title",
      initialValue: "An idea in the morning, live in the afternoon.",
    }),
    defineField({
      name: "closingText",
      type: "text",
      title: "Closing text",
      rows: 3,
      initialValue:
        "Same strategy, same design system, same standards. What disappears is the hand-off: every step above happens inside your own brand system, so the page that goes live is one you would have signed off anyway.",
    }),
  ],
  preview: {
    select: {
      title: "headline",
      subtitle: "eyebrow",
    },
    prepare({ title, subtitle }) {
      return {
        title: title ?? "Process",
        subtitle: subtitle ? `Process: ${subtitle}` : "Process",
      };
    },
  },
});

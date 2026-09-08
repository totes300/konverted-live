import { defineField } from "sanity";

export const leadFormSection = defineField({
  type: "object",
  name: "leadFormSection",
  title: "Lead Form",
  icon: () => <>📅</>,
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description: "Short section label above the rule. Rendered uppercase in accent as ( LABEL ).",
      initialValue: "Start here",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "headline",
      type: "text",
      title: "Headline",
      rows: 2,
      description: "The large serif section title. A line break here is kept on desktop.",
      initialValue: "Start with a call,\nnot a proposal",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "underline",
      type: "string",
      title: "Underlined phrase",
      description: "An exact phrase from the headline to mark with the hand-drawn underline, e.g. “a proposal”.",
      initialValue: "a proposal",
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 4,
      description: "Supporting copy under the headline.",
      initialValue:
        "Thirty minutes with the people who would actually build it. We look at your site, your brand and the way your team works, then tell you straight whether WebOS is the right move — and what it would cost.",
    }),
    defineField({
      name: "bookingIntro",
      type: "text",
      title: "Booking intro",
      rows: 2,
      description: "The line above the calendar.",
      initialValue: "Pick a slot that suits you. Thirty minutes, straight to the point.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "calLink",
      type: "string",
      title: "Cal.com link",
      description: "The handle and event type from the Cal.com booking URL, e.g. “konverted/30min”.",
      initialValue: "konverted/30min",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "calNamespace",
      type: "string",
      title: "Cal.com namespace",
      description: "Scopes the booker when a page embeds more than one event type. Match the event type, e.g. “30min”.",
      initialValue: "30min",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "reassurance",
      type: "string",
      title: "Reassurance",
      description: "The line under the calendar that answers “what am I signing up for”.",
      initialValue: "No newsletter, no sales sequence. Thirty minutes with the people who would build it.",
    }),
    defineField({
      name: "contact",
      type: "object",
      title: "Who answers",
      description: "The face beside the calendar: the person on the other side of the call.",
      options: { collapsed: false, collapsible: false },
      fields: [
        defineField({
          name: "portrait",
          type: "image",
          title: "Portrait",
          options: { hotspot: true },
          description: "A real photograph of the person who takes the call.",
          validation: (R) => R.required(),
        }),
        defineField({
          name: "name",
          type: "string",
          title: "Name",
          initialValue: "Ádám Tóth",
          validation: (R) => R.required(),
        }),
        defineField({
          name: "role",
          type: "string",
          title: "Role",
          initialValue: "Founder, Konverted",
        }),
        defineField({
          name: "note",
          type: "string",
          title: "Note",
          description: "One line of reassurance under the name, e.g. who the visitor actually gets on the call.",
          initialValue: "You will be talking to him, not to a sales rep.",
        }),
        defineField({
          name: "email",
          type: "string",
          title: "Email",
          description: "Shown as a direct mailto link for anyone who would rather write than book a slot.",
          initialValue: "adam@konverted.io",
        }),
        defineField({
          name: "phone",
          type: "string",
          title: "Phone",
          description: "Optional. Shown as a tel link beside the email.",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "headline",
      subtitle: "eyebrow",
      media: "contact.portrait",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title ?? "Lead Form",
        subtitle: subtitle ? `Lead Form — ${subtitle}` : "Lead Form",
        media,
      };
    },
  },
});

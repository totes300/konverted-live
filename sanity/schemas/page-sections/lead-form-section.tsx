import { defineArrayMember, defineField } from "sanity";
import { buildMediaPreview, createMediaField, mediaPreviewSelect } from "../fields/create-media";

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
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 4,
      description: "Supporting copy under the headline.",
      initialValue:
        "Thirty minutes with the people who would actually build it. We look at your site, your brand and the way your team works, then tell you straight whether WebOS is the right move, and what it would cost.",
    }),
    defineField({
      name: "points",
      type: "array",
      title: "Checklist",
      description:
        "What the visitor walks away with. They render as ruled rows, so they only read as a set while they stay parallel: one line each, same shape, three or four of them.",
      of: [defineArrayMember({ type: "string" })],
      initialValue: [
        "A read on your current site, in front of you",
        "Where WebOS would and would not pay off",
        "A budget and a timeline you can take to your team",
      ],
      validation: (R) => R.max(5),
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
      description: "The signature under the checklist: who the visitor actually reaches.",
      options: { collapsed: false, collapsible: false },
      fields: [
        createMediaField({
          name: "portraitMedia",
          title: "Portrait",
          description: "The person who takes the call, as a photograph or a short looping video.",
          blacklist: ["rive", "lottie"],
          options: { collapsed: false, collapsible: false },
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
          description: "The line under the name, e.g. “Founder / CEO”.",
          initialValue: "Founder / CEO",
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
      ...mediaPreviewSelect("contact.portraitMedia"),
    },
    prepare({ title, subtitle, ...media }) {
      return {
        ...buildMediaPreview(media),
        title: title ?? "Lead Form",
        subtitle: subtitle ? `Lead Form: ${subtitle}` : "Lead Form",
      };
    },
  },
});

import { defineArrayMember, defineField } from "sanity";
import { buildMediaPreview, createMediaField, mediaPreviewSelect } from "../fields/create-media";

export const teamSection = defineField({
  type: "object",
  name: "teamSection",
  title: "Team",
  icon: () => <>📸</>,
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description: "Short section label above the rule. Rendered uppercase in accent as ( LABEL ).",
      initialValue: "About",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "headline",
      type: "text",
      title: "Headline",
      rows: 3,
      description: "The large section title. A line break here is kept on desktop.",
      initialValue: "Brands with purpose.\nExceptional team.\nOne passion.",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 4,
      description: "Supporting copy beside the headline, marked with the arrow.",
    }),
    defineField({
      name: "layout",
      type: "string",
      title: "Layout",
      initialValue: "stage",
      options: {
        layout: "radio",
        list: [
          { title: "Stage — dark, the moments drift past on a filmstrip", value: "stage" },
          { title: "Postcards — the pile that deals out on scroll", value: "postcards" },
        ],
      },
      description:
        "Stage is the editorial layout: ink background, the copy up top, and every moment on a filmstrip that runs on its own. Postcards is the earlier scroll-driven pile, kept as a fallback.",
    }),
    defineField({
      name: "outro",
      type: "text",
      title: "Outro",
      rows: 3,
      description: "Stage only: a closing paragraph under the filmstrip. Leave empty to end on the strip.",
      hidden: ({ parent }) => parent?.layout === "postcards",
    }),
    defineField({
      name: "moments",
      type: "array",
      title: "Moments",
      description:
        "The moments. On the stage they run left along a filmstrip in this order. As postcards they start as a pile and deal out on scroll: into a fan on a wide screen, into a strip that slides past on a phone, and order is the pile's stacking order, so the last one lands on top and is dealt first. Five to twelve reads best; any of them can be a video.",
      of: [
        defineArrayMember({
          type: "object",
          name: "teamMoment",
          fields: [
            createMediaField({
              title: "Media",
              blacklist: ["rive", "lottie"],
              validation: (R) => R.required(),
              options: { collapsed: false, collapsible: false },
            }),
            defineField({
              name: "caption",
              type: "string",
              title: "Caption",
              description: "Optional label under the moment, e.g. “Kickoff, Berlin”.",
            }),
            defineField({
              name: "isHero",
              type: "boolean",
              title: "Grows to full screen",
              description:
                "Postcards only. The finale: once the fan is open this moment rises and fills the screen. Switch it on for one moment; with none chosen, the first video takes it, or the last moment if there is no video.",
              initialValue: false,
            }),
          ],
          preview: {
            select: { caption: "caption", ...mediaPreviewSelect("appMedia") },
            prepare: ({ caption, ...media }) => {
              const preview = buildMediaPreview(media);
              return { ...preview, title: caption ?? preview.title, subtitle: caption ? preview.title : undefined };
            },
          },
        }),
      ],
      validation: (R) => R.required().min(5).max(12),
    }),
  ],
  preview: {
    select: {
      title: "headline",
      moments: "moments",
    },
    prepare({ title, moments }) {
      const count = Array.isArray(moments) ? moments.length : 0;
      return {
        title: title ?? "Team",
        subtitle: `Team — ${count} moment${count === 1 ? "" : "s"}`,
      };
    },
  },
});

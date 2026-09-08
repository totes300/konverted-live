import { defineField } from "sanity";
import { createMediaField } from "../fields/create-media";

export const marqueeSection = defineField({
  type: "object",
  name: "marqueeSection",
  title: "Marquee",
  icon: () => <>🎞️</>,
  fields: [
    defineField({
      name: "headline",
      type: "string",
      title: "Headline",
      description:
        "The strip's words, e.g. “Selected Works”. Rendered uppercase, each word separated by the morphing webOS mark.",
      initialValue: "Selected Works",
      validation: (R) => R.required(),
    }),
    createMediaField({
      name: "tile",
      title: "Strip tile",
      description:
        "Optional image or video riding in the strip. It punctuates each pass of the headline, in place of the mark that would close it.",
      blacklist: ["rive", "lottie"],
      options: { collapsed: false, collapsible: false },
    }),
    defineField({
      name: "showMark",
      type: "boolean",
      title: "Show the webOS mark",
      description:
        "The morphing pixel mark that separates the words. Switch it off when the strip carries a tile and the type should hold the attention on its own.",
      initialValue: true,
    }),
    defineField({
      name: "statement",
      type: "text",
      title: "Statement",
      rows: 2,
      description: "The display line under the strip, centred. Set in the serif accent face, so keep it to a few words.",
      initialValue: "If you can think it, your team can ship it",
    }),
    defineField({
      name: "lede",
      type: "text",
      title: "Lede",
      rows: 3,
      description: "Short supporting copy under the statement.",
      initialValue:
        "Each of these brands came through branding, web design and agentic development with us. Their marketing teams now edit and extend the site themselves through webOS, shipping at the speed their ideas arrive.",
    }),
  ],
  preview: {
    select: {
      title: "headline",
    },
    prepare({ title }) {
      return {
        title: title ?? "Marquee",
        subtitle: "Marquee",
      };
    },
  },
});

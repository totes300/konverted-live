import { defineArrayMember, defineField, defineType } from "sanity";
import { SANITY_WORK_INDEX_URI } from "../../constants";
import { uniqueReferenceArray, visibleIf } from "../../utils";
import { createAgentMarkdownField } from "../fields/create-agent-markdown-field";
import { createLinkField } from "../fields/create-link";
import { createMediaField } from "../fields/create-media";
import { createPageBuilderField } from "../fields/create-page-builder";
import { createRichTextField } from "../fields/create-rich-text";
import { createSeoField } from "../fields/create-seo-field";
import { createUriField } from "../fields/create-uri-field";

const uniqueServices = uniqueReferenceArray({
  arrayKey: "services",
  message: "Each service can only be selected once. Remove duplicate selections.",
});

const visibleIfMode = visibleIf("mode");

/** The card's two preview kinds are mutually exclusive, so each one is only required in its own mode. */
const requiredInMode = (mode: string, message: string) => (value: unknown, context: { parent?: unknown }) => {
  if ((context.parent as { mode?: string } | undefined)?.mode !== mode) {
    return true;
  }

  return value ? true : message;
};

export const caseStudy = defineType({
  __experimental_formPreviewTitle: false,
  name: "caseStudy",
  type: "document",
  title: "Case Study",
  icon: () => <>🏆</>,
  groups: [
    { name: "page", title: "Page", icon: () => <>📄</>, default: true },
    { name: "card", title: "Card", icon: () => <>🃏</> },
    { name: "content", title: "Content", icon: () => <>🍱</> },
    { name: "seo", title: "SEO", icon: () => <>🔍</> },
    { name: "agents", title: "Agents", icon: () => <>🤖</> },
  ],
  fields: [
    defineField({
      group: "page",
      name: "title",
      type: "string",
      title: "Title",
      description: "The project name, as it reads in the work grid, e.g. “De’Longhi and Koffeinservice”.",
      validation: (R) => R.required(),
    }),
    createUriField({
      group: "page",
      source: "title",
      // Auto-slug under the work index, whose own URI is pinned to the same constant.
      slugify: ({ slug }) => `${SANITY_WORK_INDEX_URI}/${slug}`,
      validation: (R) => R.required(),
    }),
    defineField({
      group: "page",
      name: "publishedAt",
      type: "date",
      title: "Published At",
      description: `Orders the grid on ${SANITY_WORK_INDEX_URI}, newest first.`,
      validation: (R) => R.required(),
    }),
    defineField({
      group: "page",
      name: "passwordProtected",
      type: "boolean",
      title: "Password protect",
      description:
        "When “Protect entire site” is off, only this URL requires Basic Auth (same BASIC_AUTH_* env credentials as site-wide). When site-wide protection is on, this is redundant. Takes effect on Publish (not on save), within about five minutes.",
      initialValue: false,
      options: { layout: "switch" },
    }),
    defineField({
      group: "page",
      name: "showHeader",
      type: "boolean",
      title: "Show site header",
      description: "Renders the site header (navigation) on this page.",
      initialValue: true,
      options: { layout: "switch" },
    }),
    defineField({
      group: "page",
      name: "showFooter",
      type: "boolean",
      title: "Show site footer",
      description: "Renders the site footer on this page.",
      initialValue: true,
      options: { layout: "switch" },
    }),
    defineField({
      group: "page",
      name: "cover",
      type: "image",
      title: "Cover",
      description:
        "The wide opening image under the title, on the case study page only. Runs the full page width, so a landscape frame reads best; set the hotspot for the crop on narrow screens.",
      options: { hotspot: true },
      validation: (R) => R.required(),
    }),
    defineField({
      group: "card",
      name: "services",
      type: "array",
      title: "Services",
      description: "What we did on this project. Listed beside the title in the grid, in this order.",
      of: [
        defineArrayMember({
          type: "reference",
          title: "Service",
          to: [{ type: "service", validation: (R) => R.required() }],
          options: { filter: uniqueServices.filter },
        }),
      ],
      validation: (R) => uniqueServices.validation(R),
    }),
    defineField({
      group: "card",
      name: "card",
      type: "object",
      title: "Grid card",
      description:
        "How this project appears in the work grid: how wide it runs, the image it rests on, and what plays under the cursor. The card crops to 16/9 on a full row and 6/5 on a half row, so its image is its own, cut for that shape.",
      options: { collapsed: false, collapsible: true },
      fields: [
        defineField({
          name: "width",
          type: "string",
          title: "Width",
          initialValue: "half",
          description:
            "Half cards pair up side by side; a full card takes the whole row. One column below the large breakpoint either way.",
          options: {
            layout: "radio",
            list: [
              { title: "Half row", value: "half" },
              { title: "Full row", value: "full" },
            ],
          },
        }),
        defineField({
          name: "mode",
          type: "string",
          title: "Preview",
          initialValue: "gallery",
          description:
            "What the card shows on hover: its own image plus any Image grid frames you marked for the card, cutting past one another, or a video that starts playing.",
          options: {
            layout: "radio",
            direction: "horizontal",
            list: [
              { title: "🖼️ Image gallery", value: "gallery" },
              { title: "🎥 Video", value: "video" },
            ],
          },
          validation: (R) => R.required(),
        }),
        defineField({
          name: "image",
          type: "image",
          title: "Card image",
          description:
            "The frame the card rests on in the work grid, and the first one in its hover cycle. Cropped to 16/9 on a full row and 6/5 on a half row, so upload a cut made for the card rather than the page cover.",
          options: { hotspot: true },
          ...visibleIfMode("gallery"),
          validation: (R) => R.custom(requiredInMode("gallery", "Add a card image.")),
        }),
        defineField({
          name: "cycleMs",
          type: "number",
          title: "Cycle speed (ms)",
          description: "Milliseconds each frame stays on screen before the hard cut. 400 matches the gallery section.",
          initialValue: 400,
          ...visibleIfMode("gallery"),
          validation: (R) => R.min(100).max(5000),
        }),
        createMediaField({
          title: "Video",
          description: "Plays muted and looping on hover, and pauses again on leave. Its cover image is the resting frame.",
          whitelist: ["videoMux", "videoFile", "videoUrl"],
          ...visibleIfMode("video"),
          validation: (R) => R.custom(requiredInMode("video", "Add a video.")),
        }),
      ],
    }),
    defineField({
      group: "content",
      name: "lede",
      type: "text",
      rows: 3,
      title: "Lede",
      description: "The paragraph beside the title at the top of the case study page.",
    }),
    createRichTextField({
      group: "content",
      name: "content",
      title: "Overview",
      description: "The project write-up under the “( Overview )” label.",
    }),
    defineField({
      group: "content",
      name: "facts",
      type: "array",
      title: "Facts",
      description: "The label/value pairs under the overview (client, industry, year, scope).",
      of: [
        defineArrayMember({
          type: "object",
          name: "fact",
          fields: [
            defineField({ name: "label", type: "string", title: "Label", validation: (R) => R.required() }),
            defineField({ name: "value", type: "string", title: "Value", validation: (R) => R.required() }),
          ],
          preview: { select: { title: "value", subtitle: "label" } },
        }),
      ],
    }),
    createLinkField({
      group: "content",
      title: "Visit website",
      description: "The live project. Rendered as the “Visit website” link under the facts; leave empty to hide it.",
    }),
    createPageBuilderField({
      group: "content",
      description:
        "Everything below the overview: drag in sections to tell the rest of the story. Drop the project's images into an Image grid section and set each frame's width there.",
    }),
    createSeoField({
      group: "seo",
    }),
    createAgentMarkdownField({
      group: "agents",
    }),
  ],
  preview: {
    select: {
      title: "title",
      publishedAt: "publishedAt",
      cover: "cover",
      cardImage: "card.image",
      videoCover: "card.appMedia.videoCover",
    },
    prepare({ title, publishedAt, cover, cardImage, videoCover }) {
      return {
        title,
        subtitle: publishedAt ?? SANITY_WORK_INDEX_URI,
        media: cover ?? cardImage ?? videoCover,
      };
    },
  },
});

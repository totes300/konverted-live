import { defineArrayMember, defineField, defineType } from "sanity";
import { requiredIf } from "../../utils";
import { createLinkField } from "../fields/create-link";
import { createRichTextField } from "../fields/create-rich-text";
import { createSeoField } from "../fields/create-seo-field";

// Only the switch decides whether the announcement bar renders. The copy stays on screen either
// way, so it can be written, reviewed and kept between runs without the bar being live.
const requiredIfEnabled = requiredIf("enabled");

/**
 * Site holds the copy that renders on every page: the site name, navigation labels, SEO defaults,
 * the 404 copy, the contacts. Configuration that is set once and rarely revisited (redirects, Basic
 * Auth, the favicon, the agent surfaces, notification emails) lives on the `siteSettings` singleton
 * instead, so editors open this document and find only things they write.
 */
export const site = defineType({
  __experimental_formPreviewTitle: false,
  name: "site",
  type: "document",
  title: "Site",
  icon: () => <>🖥</>,
  groups: [
    { name: "site", title: "Site", icon: () => <>🖥</>, default: true },
    { name: "announcement", title: "Announcement", icon: () => <>📣</> },
    { name: "seo", title: "SEO", icon: () => <>🔍</> },
    { name: "contacts", title: "Contacts", icon: () => <>📞</> },
    { name: "header", title: "Header", icon: () => <>🔗</> },
    { name: "footer", title: "Footer", icon: () => <>👟</> },
  ],
  fields: [
    defineField({
      group: "site",
      name: "name",
      type: "string",
      title: "Site Name",
      initialValue: "Konverted Web Agency",
      validation: (R) => R.required(),
    }),
    defineField({
      group: "site",
      name: "notFound",
      type: "object",
      fields: [
        createRichTextField({ title: "Text", validation: (R) => R.required() }),
        createLinkField({ title: "Link", validation: (R) => R.required() }),
        defineField({
          name: "showHeader",
          type: "boolean",
          title: "Show site header",
          description: "Renders the site header (navigation) on this page.",
          initialValue: true,
          options: { layout: "switch" },
        }),
        defineField({
          name: "showFooter",
          type: "boolean",
          title: "Show site footer",
          description: "Renders the site footer on this page.",
          initialValue: true,
          options: { layout: "switch" },
        }),
      ],
    }),
    defineField({
      group: "announcement",
      name: "announcement",
      type: "object",
      title: "Announcement",
      description:
        "The bar above the header on every page. Switching it off leaves the copy here untouched. A visitor who dismisses the bar does not see it again for 24 hours, including if it is rewritten in the meantime.",
      options: { collapsed: false, collapsible: false },
      fields: [
        defineField({
          name: "enabled",
          type: "boolean",
          title: "Show announcement",
          initialValue: false,
          options: { layout: "switch" },
        }),
        defineField({
          name: "theme",
          type: "string",
          title: "Theme",
          initialValue: "dark",
          options: {
            layout: "radio",
            list: [
              { title: "Dark", value: "dark" },
              { title: "Light", value: "light" },
            ],
          },
        }),
        defineField({
          name: "text",
          type: "string",
          title: "Text",
          description: "Keep it to one line; it scrolls as a marquee on any viewport too narrow to fit it.",
          ...requiredIfEnabled(true),
        }),
        createLinkField({
          title: "Link",
          description: "Optional call to action after the text.",
        }),
      ],
      preview: {
        select: { enabled: "enabled", text: "text" },
        prepare: ({ enabled, text }) => ({
          title: text || "Announcement",
          subtitle: enabled ? "Visible" : "Hidden",
        }),
      },
    }),
    defineField({
      group: "header",
      name: "header",
      type: "object",
      description: "The header carries the logo and one call to action. It has no navigation links by design.",
      fields: [
        createLinkField({
          name: "cta",
          title: "Call to action",
          description: "The single button in the header.",
          validation: (R) => R.required(),
        }),
        defineField({
          name: "availability",
          type: "string",
          title: "Availability",
          description:
            'Optional scarcity line beside the button, e.g. "2 project slots left for Q4". Rendered in brackets, and only from large screens up. On a phone the header has no room for it, so put it in the announcement bar instead.',
        }),
      ],
    }),
    defineField({
      group: "contacts",
      name: "contacts",
      type: "array",
      title: "Contacts",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "name",
              type: "string",
              validation: (R) => R.required(),
            }),
            createLinkField({ title: "Link", validation: (R) => R.required() }),
          ],
        }),
      ],
    }),
    defineField({
      group: "footer",
      name: "footer",
      type: "object",
      fields: [
        defineField({
          name: "tagline",
          type: "string",
          title: "Tagline",
          description: "The line that closes the site, stamped with the brand mark. The footer carries no navigation.",
          validation: (R) => R.required(),
        }),
      ],
    }),
    createSeoField({
      group: "seo",
    }),
  ],
});

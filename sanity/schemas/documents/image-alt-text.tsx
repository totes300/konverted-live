import { defineField, defineType } from "sanity";

/**
 * Scratch document for the alt text agent. Editors never see it and nothing is ever stored in it.
 *
 * Alt text lives on `sanity.imageAsset.altText` (the media plugin's convention, and what the image
 * fragments read). Agent Actions cannot target that document: describing an image is a Transform
 * target operation, Transform is schema-aware, and `sanity.imageAsset` is a system type outside the
 * deployed workspace schema. So the description is generated into this type's `altText` field with
 * `noWrite: true`, read off the response, and patched onto the asset by the route.
 *
 * Registered in `AGENT_SCRATCH_DOCUMENTS`, which removes its "create new" template (`templates.tsx`),
 * restricts its document actions (`actions.tsx`), and keeps it out of `structure.tsx`.
 */
export const imageAltText = defineType({
  name: "imageAltText",
  type: "document",
  title: "Image alt text (internal)",
  icon: () => <>♿</>,
  fields: [
    defineField({
      name: "altText",
      type: "string",
      title: "Alternative text",
      description: "Generation target only. The value is returned to the caller, never written here.",
    }),
  ],
});

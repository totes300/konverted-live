import { defineField, defineType } from "sanity";
import { sanityConfig } from "../../config";

/**
 * One thing the agency does (Strategy, Brand design, Website, webOS). Its own document rather than a
 * list in code so the vocabulary grows from the Studio, and so renaming one relabels every case study.
 */
export const service = defineType({
  __experimental_formPreviewTitle: false,
  name: "service",
  type: "document",
  title: "Service",
  icon: () => <>🛠️</>,
  fields: [
    defineField({
      name: "name",
      type: "string",
      title: "Name",
      description: "The label listed beside a case study, e.g. “Strategy”.",
      validation: (R) =>
        R.required().custom(async (name, context) => {
          if (!name || typeof name !== "string") {
            return true;
          }

          const client = context.getClient({ apiVersion: sanityConfig.apiVersion });
          const docId = context.document?._id;
          const baseId = docId?.replace(/^drafts\./, "") ?? "";
          const idsToExclude = baseId ? [docId, baseId].filter(Boolean) : [];

          const query =
            idsToExclude.length > 0
              ? `count(*[_type == "service" && name == $name && !(_id in $excludeIds)])`
              : `count(*[_type == "service" && name == $name])`;

          const count = await client.fetch(query, {
            name: name.trim(),
            excludeIds: idsToExclude,
          });

          return count === 0 || "A service with this name already exists.";
        }),
    }),
  ],
  preview: {
    select: { title: "name" },
  },
});

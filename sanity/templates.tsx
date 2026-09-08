import type { Template } from "sanity";
import { AGENT_SCRATCH_DOCUMENTS, API_ONLY_DOCUMENTS, SINGLETON_IDS, SINGLETON_ROUTES, TEMPLATE_IDS } from "./constants";

/**
 * Template for creating the homepage singleton (`page` with id `homepage`).
 * Title comes from parameters; `uri.current` is always `SINGLETON_ROUTES[SINGLETON_IDS.homepage]` (`"/"`).
 */
const pageSingletonTemplate = {
  id: TEMPLATE_IDS.pageSingleton,
  title: "Singleton Page Template",
  schemaType: "page",
  parameters: [{ name: "title", type: "string" }],
  value: ({ title }: { title: string }) => ({
    title,
    uri: { current: SINGLETON_ROUTES[SINGLETON_IDS.homepage] },
  }),
} satisfies Template;

/**
 * Omit default “new document” templates for singleton-only schema types (`site`, `siteSettings`,
 * `blog`, `work`), for API-only types, and for agent scratch types. Document ids like `homepage` are
 * not `schemaType` values, so do not use `SINGLETON_IDS` values for this filter.
 */
const SCHEMA_TYPES_SINGLETON_VIA_DESK_ONLY: readonly string[] = ["site", "siteSettings", "blog", "work"];

const apiOnlyValues: string[] = Object.values(API_ONLY_DOCUMENTS);
const scratchValues: string[] = Object.values(AGENT_SCRATCH_DOCUMENTS);

export function createDocumentTemplates(prev: Template<unknown, unknown>[]) {
  const builtInTemplates = prev.filter(({ schemaType }) => {
    const st = schemaType ?? "";
    return !SCHEMA_TYPES_SINGLETON_VIA_DESK_ONLY.includes(st) && !apiOnlyValues.includes(st) && !scratchValues.includes(st);
  });

  return [...builtInTemplates, pageSingletonTemplate] as const satisfies Template<unknown, unknown>[];
}

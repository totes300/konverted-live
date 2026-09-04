// The category filter lives entirely in the URL (`?category=engineering&category=design`), which is
// what makes the filtering server-side: the list renders already filtered, needs no JavaScript,
// survives a reload, is crawlable, and a filtered view can be linked to.

/** The query parameter the filter reads and writes. Repeated once per selected category. */
export const CATEGORY_PARAM = "category";

/**
 * The selected category slugs, deduplicated and cleaned. Unknown slugs are dropped against `known`,
 * so a hand-edited or stale URL narrows the list to nothing instead of filtering on a slug that no
 * longer exists.
 */
export function selectedCategories(params: URLSearchParams, known: readonly string[]): string[] {
  const allowed = new Set(known);
  const selected = new Set<string>();

  for (const value of params.getAll(CATEGORY_PARAM)) {
    const slug = value.trim();

    if (slug && allowed.has(slug)) {
      selected.add(slug);
    }
  }

  return [...selected];
}

/**
 * The URL that adds `slug` to the current selection, or removes it when it is already selected.
 *
 * Built from `pathname` plus the category params alone: any other query on the URL is intentionally
 * dropped, because nothing else on this page is addressed by one and carrying an unknown parameter
 * through a filter click would be a way to smuggle state into a cached URL.
 */
export function toggleCategoryHref(pathname: string, selected: readonly string[], slug: string): string {
  const next = selected.includes(slug) ? selected.filter((entry) => entry !== slug) : [...selected, slug];

  if (next.length === 0) {
    return pathname;
  }

  const params = new URLSearchParams();

  for (const entry of next) {
    params.append(CATEGORY_PARAM, entry);
  }

  return `${pathname}?${params.toString()}`;
}

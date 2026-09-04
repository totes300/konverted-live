import { defineQuery } from "groq";
import { RichTextFunctions, richText } from "~/features/rich-text/fragment";
import {
  SANITY_ARTICLE_CATEGORY_DOCUMENT_TYPE,
  SANITY_ARTICLE_DOCUMENT_TYPE,
  SANITY_SINGLETON_BLOG_ID,
} from "~/sanity/constants";

/**
 * The listing rendered by ArticleList.astro: the blog index's own copy plus every article, newest first.
 *
 * `$categories` is the list of category slugs from the URL (`?category=…`), empty when nothing is
 * selected.
 *
 * `categories` is the filter bar's own vocabulary, and it is derived from the articles rather than
 * read off the category documents: the set is exactly the refs the listed articles carry, so a chip
 * can never appear for a category nothing is filed under. It reuses the same `defined(uri.current)`
 * guard the list does, and is deliberately not narrowed by `$categories`, because the bar has to keep
 * offering the filters that are not currently on. (`array::unique` compares with `==`, which is not
 * defined for objects in GROQ, so the deduplication is the `in` test rather than a unique() call.)
 */
export const BlogArticleListQ = defineQuery(`${RichTextFunctions}
*[_id == "${SANITY_SINGLETON_BLOG_ID}"][0]{
  heading,
  "intro": ${richText("intro")},
  "articles": *[
    _type == "${SANITY_ARTICLE_DOCUMENT_TYPE}"
    && defined(uri.current)
    && (count($categories) == 0 || count(categories[@->slug.current in $categories]) > 0)
  ] | order(publishedAt desc){
    _id,
    title,
    "href": uri.current,
    publishedAt,
    "author": author->name,
    "categories": categories[]->name,
  },
  "categories": *[
    _type == "${SANITY_ARTICLE_CATEGORY_DOCUMENT_TYPE}"
    && defined(slug.current)
    && _id in *[_type == "${SANITY_ARTICLE_DOCUMENT_TYPE}" && defined(uri.current)].categories[]._ref
  ] | order(name asc){
    "key": _id,
    name,
    "slug": slug.current,
  },
}`);

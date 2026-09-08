import { defineQuery } from "groq";
import { AuthorFragment } from "~/features/blog/author/fragment";
import { CaseStudyCardFunctions, caseStudyCard } from "~/features/case-study/fragment";
import { RichTextFunctions, richText } from "~/features/rich-text/fragment";
import { link } from "~/features/sanity/link/fragment";
import { image } from "~/features/sanity/media/fragment";
import { SeoFunctions, SeoMetadataFragment } from "~/features/site/seo/fragment";
import {
  SANITY_ARTICLE_DOCUMENT_TYPE,
  SANITY_BLOG_INDEX_URI,
  SANITY_CASE_STUDY_DOCUMENT_TYPE,
  SANITY_LEGAL_PAGE_DOCUMENT_TYPE,
  SANITY_PAGE_DOCUMENT_TYPE,
  SANITY_PERSON_DOCUMENT_TYPE,
  SANITY_SINGLETON_BLOG_ID,
  SANITY_SINGLETON_WORK_ID,
  SANITY_WORK_INDEX_URI,
} from "~/sanity/constants";

// Route-level queries for the pages model. Fragments live beside their features
// (src/features/**/fragment.ts); section queries live in src/features/page-builder/queries.ts.

// Both catch-all types resolve here, so a document's URI stays the only thing that decides where it
// is served: `page` assembles a page builder, `legalPage` is prose in one rich text field.
export const PageQ = defineQuery(`${RichTextFunctions}

  *[_type in ["${SANITY_PAGE_DOCUMENT_TYPE}", "${SANITY_LEGAL_PAGE_DOCUMENT_TYPE}"] && defined(uri.current) && uri.current == $uri][0]{
    _id,
    _type,
    title,
    "uri": coalesce(uri.current, "/"),
    "showHeader": coalesce(showHeader, true),
    "showFooter": coalesce(showFooter, true),
    seoMetadata{${SeoMetadataFragment}},
    _type == "${SANITY_LEGAL_PAGE_DOCUMENT_TYPE}" => {
      "content": ${richText("content")},
    },
  }
`);

export const ArticlePageQ = defineQuery(`${RichTextFunctions}

  *[_type == "article" && defined(uri.current) && uri.current == $uri][0]{
    _id,
    _type,
    title,
    _updatedAt,
    publishedAt,
    author->{ name, "href": uri.current },
    "categories": categories[]->name,
    "image": ${image("image")},
    "blogTitle": *[_id == "${SANITY_SINGLETON_BLOG_ID}"][0].title,
    "uri": coalesce(uri.current, "${SANITY_BLOG_INDEX_URI}"),
    "showHeader": coalesce(showHeader, true),
    "showFooter": coalesce(showFooter, true),
    "content": ${richText("content")},
    seoMetadata{${SeoMetadataFragment}},
  }
`);

// The blog index is a singleton, so it is fetched by id rather than by URI like the catch-all route.
// Its `uri` field is read-only and exists so the sitemap, llms.txt and agent Markdown keep treating every
// routed document the same way. There is no page builder: the page is always the article list.
export const BlogPageQ = defineQuery(`${SeoFunctions}

  *[_id == "${SANITY_SINGLETON_BLOG_ID}"][0]{
    _id,
    _type,
    title,
    heading,
    "uri": coalesce(uri.current, "${SANITY_BLOG_INDEX_URI}"),
    "showHeader": coalesce(showHeader, true),
    "showFooter": coalesce(showFooter, true),
    seoMetadata{${SeoMetadataFragment}},
  }
`);

// One author, for both the page at their URI and the panel an article's byline opens over itself; the
// two render the same profile, so they read the same document through one query.
export const AuthorPageQ = defineQuery(`${RichTextFunctions}

  *[_type == "${SANITY_PERSON_DOCUMENT_TYPE}" && defined(uri.current) && uri.current == $uri][0]{
    ${AuthorFragment}
    _createdAt,
    _updatedAt,
    "showHeader": coalesce(showHeader, true),
    "showFooter": coalesce(showFooter, true),
    "blogTitle": *[_id == "${SANITY_SINGLETON_BLOG_ID}"][0].title,
    seoMetadata{${SeoMetadataFragment}},
    // Matched on the author's URI rather than their id, because under the drafts perspective a
    // document's own id is a draft id while the reference still points at the published one.
    "articles": *[
      _type == "${SANITY_ARTICLE_DOCUMENT_TYPE}"
      && defined(uri.current)
      && author->uri.current == ^.uri.current
    ] | order(publishedAt desc){
      _id,
      title,
      "href": uri.current,
      publishedAt,
      "categories": categories[]->name,
    },
  }
`);

// The work index is a singleton, fetched by id like the blog index. Its grid is the route's own, so
// there is no page builder; the case studies come from `CaseStudyListQ` beside it.
export const WorkPageQ = defineQuery(`${RichTextFunctions}

  *[_id == "${SANITY_SINGLETON_WORK_ID}"][0]{
    _id,
    _type,
    title,
    eyebrow,
    heading,
    "intro": ${richText("intro")},
    "uri": coalesce(uri.current, "${SANITY_WORK_INDEX_URI}"),
    "showHeader": coalesce(showHeader, true),
    "showFooter": coalesce(showFooter, true),
    seoMetadata{${SeoMetadataFragment}},
  }
`);

// Every case study the index lists, newest first. Password-protected projects are left out: a row
// nobody can open without credentials reads as a broken link, not as a teaser.
export const CaseStudyListQ = defineQuery(`${CaseStudyCardFunctions}

  *[
    _type == "${SANITY_CASE_STUDY_DOCUMENT_TYPE}"
    && defined(uri.current)
    && passwordProtected != true
  ] | order(publishedAt desc){
    ...${caseStudyCard("@")}
  }
`);

export const CaseStudyPageQ = defineQuery(`${RichTextFunctions}

  *[_type == "${SANITY_CASE_STUDY_DOCUMENT_TYPE}" && defined(uri.current) && uri.current == $uri][0]{
    _id,
    _type,
    title,
    _updatedAt,
    publishedAt,
    lede,
    "services": services[]->name,
    "cover": ${image("cover")},
    "content": ${richText("content")},
    "facts": facts[]{ "_key": _key, label, value },
    "website": ${link("appLink")},
    "workTitle": *[_id == "${SANITY_SINGLETON_WORK_ID}"][0].title,
    "uri": coalesce(uri.current, "${SANITY_WORK_INDEX_URI}"),
    "showHeader": coalesce(showHeader, true),
    "showFooter": coalesce(showFooter, true),
    seoMetadata{${SeoMetadataFragment}},
  }
`);

export const SitemapQ = defineQuery(`
  *[defined(uri.current) && seoMetadata.noIndex != true && passwordProtected != true]{
    "uri": uri.current,
    "updatedAt": _updatedAt,
  }
`);

// PLOP: Add Route Query

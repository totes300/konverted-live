import { defineQuery } from "groq";
import { SECTION_SETTINGS } from "~/features/page-builder/section-layout";
import { RichTextFunctions, richText } from "~/features/rich-text/fragment";
import { link } from "~/features/sanity/link/fragment";
import { MediaFunctions, media } from "~/features/sanity/media/fragment";

// Every section self-fetches its own slice by docId + sectionKey (see the section components).

// Keyed by uri, not by document id, so the route fetches it in parallel with its own document query
// rather than after it. Matched on `uri.current` alone (not a fixed type list) so new routed types
// are covered, the same way `AgentMarkdownContentQuery` resolves a routed document.
export const PageSectionsQ = defineQuery(`*[defined(uri.current) && uri.current == $uri][0]
  .pageBuilder.sectionsArray[sectionSettings.disabled != true]{
    _key,
    _type
  }`);

export const TextSectionQ = defineQuery(`${RichTextFunctions}
*[_id == $docId][0].pageBuilder.sectionsArray[_type == "textSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      headline,
      "text": ${richText("appRichText")}
    },
    ${SECTION_SETTINGS},
}`);

export const CtaSectionQ = defineQuery(`${RichTextFunctions}
*[_id == $docId][0].pageBuilder.sectionsArray[_type == "ctaSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      headline,
      "cta": ${link("appLink")},
      "text": ${richText("appRichText")}
    },
    ${SECTION_SETTINGS}
}`);

export const MediaSectionQ = defineQuery(`${MediaFunctions}
*[_id == $docId][0].pageBuilder.sectionsArray[_type == "mediaSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      caption,
      useParallax,
      fullBleed,
      "media": ${media("appMedia")}
    },
    ${SECTION_SETTINGS}
}`);

export const ContactFormSectionQ = defineQuery(`${RichTextFunctions}
*[_id == $docId][0].pageBuilder.sectionsArray[_type == "contactFormSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      headline,
      "text": ${richText("appRichText")},
    },
    ${SECTION_SETTINGS},
}`);

// PLOP: Add Section Query

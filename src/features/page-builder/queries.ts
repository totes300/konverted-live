import { defineQuery } from "groq";
import { CaseStudyCardFunctions, caseStudyCard } from "~/features/case-study/fragment";
import { SECTION_SETTINGS } from "~/features/page-builder/section-layout";
import { RichTextFunctions, richText } from "~/features/rich-text/fragment";
import { LinkFn, link } from "~/features/sanity/link/fragment";
import { ImageFragment, MediaFunctions, media } from "~/features/sanity/media/fragment";

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

export const HeroSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "heroSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      headline,
      highlight,
      lede,
    },
    ${SECTION_SETTINGS},
}`);

export const GallerySectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "gallerySectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      "cycleMs": coalesce(cycleMs, 400),
      "images": images[]{
        "_key": _key,
        ${ImageFragment}
      },
    },
    ${SECTION_SETTINGS},
}`);

export const ImageGridSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "imageGridSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      "images": images[]{
        "_key": _key,
        width,
        ${ImageFragment}
      },
    },
    ${SECTION_SETTINGS},
}`);

export const StatementSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "statementSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      headline,
      statement,
      support,
    },
    ${SECTION_SETTINGS},
}`);

export const SolutionSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "solutionSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      eyebrow,
      headline,
      underline,
      lede,
      "items": items[]{
        "_key": _key,
        title,
        text,
        "image": image{${ImageFragment}},
      },
    },
    ${SECTION_SETTINGS},
}`);

export const IntersectionSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "intersectionSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      eyebrow,
      headline,
      lede,
      leftLabel,
      rightLabel,
    },
    ${SECTION_SETTINGS},
}`);

export const WebosSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "webosSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      eyebrow,
      headline,
      underline,
      body,
      "items": items[]{
        "_key": _key,
        title,
        text,
      },
    },
    ${SECTION_SETTINGS},
}`);

export const MarqueeSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "marqueeSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      headline,
      statement,
      lede,
    },
    ${SECTION_SETTINGS},
}`);

export const CaseStudySectionQ = defineQuery(`${CaseStudyCardFunctions}
${LinkFn}
*[_id == $docId][0].pageBuilder.sectionsArray[_type == "caseStudySectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      label,
      title,
      code,
      services,
      "link": ${link("appLink")},
      "caseStudies": caseStudies[]->{
        ...${caseStudyCard("@")}
      },
    },
    ${SECTION_SETTINGS},
}`);

export const LogoWallSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "logoWallSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      metric,
      statement,
      "swapMs": coalesce(swapMs, 1500),
      "logos": logos[]{
        "_key": _key,
        name,
        "url": image.asset->url,
      },
    },
    ${SECTION_SETTINGS},
}`);

export const ProcessSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "processSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      eyebrow,
      headline,
      underline,
      lede,
      timelineLabel,
      oldTitle,
      oldCaption,
      "oldSteps": oldSteps[]{
        "_key": _key,
        label,
        "days": coalesce(days, 1),
      },
      newTitle,
      newCaption,
      newLabel,
      "newSteps": newSteps[]{
        "_key": _key,
        label,
        icon,
        isFinal,
        showOnMobile,
      },
      closingTitle,
      closingText,
    },
    ${SECTION_SETTINGS},
}`);

export const LogoStripSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "logoStripSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      statement,
      "logos": logos[]{
        "_key": _key,
        name,
        "url": image.asset->url,
        "ratio": coalesce(image.asset->metadata.dimensions.aspectRatio, 4),
        "href": caseStudy->uri.current,
      },
    },
    ${SECTION_SETTINGS},
}`);

export const TeamSectionQ = defineQuery(`${MediaFunctions}
*[_id == $docId][0].pageBuilder.sectionsArray[_type == "teamSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      eyebrow,
      headline,
      lede,
      "layout": coalesce(layout, "stage"),
      outro,
      "moments": moments[]{
        "_key": _key,
        caption,
        isHero,
        "media": ${media("appMedia")}
      },
    },
    ${SECTION_SETTINGS},
}`);

export const LeadFormSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "leadFormSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      eyebrow,
      headline,
      underline,
      lede,
      bookingIntro,
      calLink,
      calNamespace,
      reassurance,
      contact{
        name,
        role,
        note,
        email,
        phone,
        "portrait": portrait{
          ${ImageFragment}
        },
      },
    },
    ${SECTION_SETTINGS},
}`);

// PLOP: Add Section Query

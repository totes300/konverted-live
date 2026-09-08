import { stegaClean } from "@sanity/client/stega";
import {
  type ImageFragmentResult,
  image,
  type MediaFragmentResult,
  MediaFunctions,
  media,
} from "~/features/sanity/media/fragment";

/**
 * One case study as the work grid renders it: the row label, the services it is tagged with, and the
 * card's resting frame plus whatever plays on hover. The two consumers are the page-builder section
 * and the work index, so it is hoisted to a function rather than copied into both queries.
 *
 * The card rests on its own `image`, cut for the card's shape rather than shared with the page cover.
 * The hover cycle continues with the frames the editor marked `showInCard` in the page's image grid
 * sections, in page order.
 */
const CaseStudyCardFragment = `
  _id,
  title,
  "href": uri.current,
  "services": services[]->name,
  "card": {
    "width": coalesce(card.width, "half"),
    "mode": coalesce(card.mode, "gallery"),
    "cycleMs": coalesce(card.cycleMs, 400),
    "image": ${image("card.image")},
    "images": pageBuilder.sectionsArray[_type == "imageGridSectionField"].sectionContent.images[showInCard == true]{ "_key": _key, ...${image("@")} },
    "media": ${media("card.appMedia")},
  }
`;

export const CaseStudyCardFn = `fn frag::caseStudyCard($value) = $value{${CaseStudyCardFragment}};`;

/** Pass `@` where the case study is the document being projected. */
export const caseStudyCard = (path: string) => `frag::caseStudyCard(${path})`;

/** Interpolate once at the head of any query calling `caseStudyCard`. */
export const CaseStudyCardFunctions = `${MediaFunctions}\n${CaseStudyCardFn}`;

export type CaseStudyCardFragmentResult = {
  _id: string;
  title?: string | null;
  href?: string | null;
  services?: (string | null | undefined)[] | null;
  card?: {
    width?: string | null;
    mode?: string | null;
    cycleMs?: number | null;
    image?: ImageFragmentResult | null;
    images?: (({ _key: string } & ImageFragmentResult) | undefined)[] | null;
    media?: MediaFragmentResult | null;
  } | null;
};

type CaseStudyCardSettings = CaseStudyCardFragmentResult["card"];

/** Cleaned, because draft mode stega-encodes these two enums and a raw `===` would never match. */
export const isFullWidthCard = (card: CaseStudyCardSettings) => stegaClean(card?.width) === "full";

export const isVideoCard = (card: CaseStudyCardSettings) => stegaClean(card?.mode) === "video";

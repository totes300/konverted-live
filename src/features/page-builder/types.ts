/**
 * Props every page-builder section receives. `isFirst` is passed to all of them so a section that
 * can hold the LCP element (currently only the media section) can opt into a priority hint.
 *
 * `docType` travels with `docId` because a section's visual-editing edit intent has to name the
 * document that owns it, and more than one type carries a page builder (`page` and `caseStudy`
 * today). A section that builds its own `createDataAttribute` must never assume which.
 */
export type SectionProps = {
  docId: string;
  docType: string;
  sectionKey: string;
  isFirst?: boolean;
};

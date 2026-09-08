# Case study images

A case study shows images in three places, and each place has its own field, so the crop made for one never has to serve another:

- **the cover** at the top of the case study page: the `cover` field on the Page tab,
- **the work grid card** on `/work`, the homepage and any Case Study section: the `card.image` field on the Card tab, optionally followed by Image grid frames marked for the card,
- **the case study page** below the overview: every frame of every **Image grid** section in the page builder.

Nothing is inferred from the page builder. Layout and inclusion are explicit per-item choices (see the `editor-control-over-inference` note in the project memory).

## The cover

`cover` is a required `image` with a hotspot. `CaseStudyPageQ` (`src/sanity/queries.ts`) projects it through the shared `image()` fragment and `src/pages/work/[slug].astro` renders it full width under the title, with `priority` so it is the LCP candidate. It never appears in the grid below, and the grid never lifts anything out.

## The card

The `Grid card` object on the case study (`card`) holds everything the card is: its `width` in the work grid (`half` or `full`), its `mode` (image gallery or video), the hover `cycleMs`, the video for video mode, and `image`, the frame it rests on in gallery mode.

The card crops to `16/9` on a full row and `6/5` on a half row, so `card.image` is meant to be a cut made for that shape rather than the page cover. In gallery mode Studio validation requires it; in video mode the video's cover image is the resting frame instead.

`CaseStudyCardFragment` (`src/features/case-study/fragment.ts`) projects `card.image` as `image` and, as `images`, the frames the editor marked `showInCard` in every Image grid section on the document, in page order:

```groq
"image": frag::image(card.image),
"images": pageBuilder.sectionsArray[_type == "imageGridSectionField"].sectionContent.images[showInCard == true]{ ... }
```

`CaseStudyCard.astro` plays `[image, ...images]`: the card's own image first, then the marked frames cut past it under the cursor. There is no cap on marked frames: every one loads with the card, so a long selection is a real page-weight cost on the work grid.

## Image grid section

Schema: `sanity/schemas/page-sections/image-grid-section.tsx`. Component: `src/features/page-builder/sections/ImageGridSection.astro`. Query: `ImageGridSectionQ` in `src/features/page-builder/queries.ts`.

The section holds one `images` array (up to 40). Because its members are plain `image` types, the Studio accepts a **multi-file drop**: drag a whole export folder onto the array and every file uploads as its own frame. Every frame renders, in array order.

Each frame carries two settings of its own, set on the row itself (`sanity/inputs/image-grid-item-input.tsx`) so a dropped batch never opens a dialog.

### Width

`full` (default) or `half`. Below the `lg` breakpoint the grid is one column, so every frame is full width. From `lg` it is two columns and a full-row frame spans both, which is what makes **consecutive half-row frames pair up side by side**: the grid places frames in array order, so the first of a pair sits on the left and the next on the right, and a half-row frame with no half-row neighbour keeps the left column with the right one empty.

Nothing is inferred from the image's proportions: a frame is only ever paired when you say so, and a dropped image that was never set runs the full row.

### Show in the work grid card

Off by default. Switching it on adds that frame to the card's hover cycle, after the card's own image. The card crops what it gets, so landscape frames are usually the ones worth marking.

## Related

- Section shape and the `SectionFrame` contract: `.agents/skills/section-anatomy/SKILL.md`
- Page builder wrapper shape (`{sectionName}Field`, `sectionContent`): [Schema and content model](../sanity/schema-and-content-model.md)

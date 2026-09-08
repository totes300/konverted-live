// Serializes an `AgentMarkdownContentQuery` page to Markdown. Pure: no Sanity or env. Section content runs
// through `sectionRenderers`: guaranteed factory fields by default, project-specific fields added in the PROJECT block.
// The blog index has no page builder; it carries its article listing on the document and renders it like a body.

import { capitalCase } from "change-case";

type Span = { _type?: string | null; text?: string | null; marks?: string[] | null };

type MarkDef = { _key?: string | null; _type?: string | null; href?: string | null };

type Block = {
  _type?: string | null;
  style?: string | null;
  listItem?: string | null;
  level?: number | null;
  children?: Span[] | null;
  markDefs?: MarkDef[] | null;
  alt?: string | null;
  imageUrl?: string | null;
};

// A projected section keyed by the aliases from `AgentMarkdownSectionContentFragment`; renderers read the
// aliases they care about, so adding a field needs no change to this type.
type RawSection = Record<string, unknown>;

type ProcessLane = {
  title?: string | null;
  caption?: string | null;
  steps?: ({ label?: string | null; days?: number | null } | null)[] | null;
};

export type AgentMarkdownPage = {
  _type?: string | null;
  uri?: string | null;
  title?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  author?: string | null;
  categories?: (string | null)[] | null;
  // Case studies only: what we ran on the project.
  services?: (string | null)[] | null;
  sections?: (RawSection | null)[] | null;
  // Articles only: the body is one rich text field on the document, not a page-builder section.
  content?: (Block | null)[] | null;
  // Blog index only: the listing lives on the document, not in a page-builder section.
  heading?: string | null;
  intro?: (Block | null)[] | null;
  articles?: (ArticleListItem | null)[] | null;
  // Work index only, the same shape one level over.
  caseStudies?: (CaseStudyListItem | null)[] | null;
};

type ArticleListItem = {
  uri?: string | null;
  title?: string | null;
  description?: string | null;
  publishedAt?: string | null;
};

type CaseStudyListItem = {
  uri?: string | null;
  title?: string | null;
  services?: (string | null)[] | null;
  publishedAt?: string | null;
};

type RenderContext = { baseUrl: string };

export type SectionRenderer = (section: RawSection, ctx: RenderContext) => string;

const DECORATORS = new Set(["strong", "em", "code"]);

function absolutize(href: string, baseUrl: string): string {
  if (!href) {
    return "";
  }

  if (href.startsWith("/")) {
    return `${baseUrl}${href}`;
  }

  return href;
}

// Headline/caption are multi-line `text` fields but render as single-line Markdown, so collapse whitespace.
function singleLine(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function titleFromUri(uri: string): string {
  const trimmed = uri.replace(/^\/|\/$/g, "");

  if (!trimmed) {
    return "Home";
  }

  const last = trimmed.split("/").filter(Boolean).at(-1) ?? "";
  return capitalCase(last) || "Home";
}

function readString(section: RawSection, key: string): string {
  return typeof section[key] === "string" ? (section[key] as string) : "";
}

function readBlocks(section: RawSection, key: string): Block[] {
  return Array.isArray(section[key]) ? (section[key] as Block[]) : [];
}

function readObject<T>(section: RawSection, key: string): T | null {
  const value = section[key];
  return value && typeof value === "object" ? (value as T) : null;
}

function renderSpan(span: Span, markDefs: MarkDef[], baseUrl: string): string {
  const text = span.text ?? "";

  if (!text) {
    return "";
  }

  const marks = span.marks ?? [];
  let out = text;

  if (marks.includes("code")) {
    out = `\`${out}\``;
  }

  if (marks.includes("em")) {
    out = `_${out}_`;
  }

  if (marks.includes("strong")) {
    out = `**${out}**`;
  }

  const linkKey = marks.find((mark) => !DECORATORS.has(mark));

  if (linkKey) {
    const def = markDefs.find((markDef) => markDef._key === linkKey);
    const href = def?.href ? absolutize(def.href, baseUrl) : "";

    if (href) {
      out = `[${out}](${href})`;
    }
  }

  return out;
}

function renderChildren(block: Block, baseUrl: string): string {
  const markDefs = block.markDefs ?? [];
  return (block.children ?? []).map((child) => renderSpan(child, markDefs, baseUrl)).join("");
}

const HEADING_PREFIX: Record<string, string> = {
  h2: "## ",
  h3: "### ",
  h4: "#### ",
};

function renderBlock(block: Block, baseUrl: string): string {
  if (block._type === "mediaBlock") {
    return block.imageUrl ? `![${block.alt ?? ""}](${block.imageUrl})` : "";
  }

  if (block._type !== "block") {
    return "";
  }

  const inline = renderChildren(block, baseUrl).trim();

  if (!inline) {
    return "";
  }

  if (block.listItem) {
    const indent = "  ".repeat(Math.max((block.level ?? 1) - 1, 0));
    const bullet = block.listItem === "number" ? "1." : "-";
    return `${indent}${bullet} ${inline}`;
  }

  const heading = block.style ? HEADING_PREFIX[block.style] : undefined;

  if (heading) {
    return `${heading}${inline}`;
  }

  if (block.style === "caption") {
    return `_${inline}_`;
  }

  return inline;
}

// Portable Text array -> Markdown. Spec-standard; not a per-project tuning point.
function renderBlocks(blocks: Block[], baseUrl: string): string {
  const lines: string[] = [];
  let previousWasList = false;

  for (const block of blocks) {
    const line = renderBlock(block, baseUrl);

    if (!line) {
      continue;
    }

    const isList = block._type === "block" && Boolean(block.listItem);

    if (lines.length > 0 && !(isList && previousWasList)) {
      lines.push("");
    }

    lines.push(line);
    previousWasList = isList;
  }

  return lines.join("\n");
}

// Default renderers for the guaranteed page-builder factory fields; reused when a clone composes its own `sectionRenderers`.

/** `appRichText` (createRichTextField) -> Markdown body. */
export const renderRichText: SectionRenderer = (section, ctx) => renderBlocks(readBlocks(section, "text"), ctx.baseUrl);

/** `appMedia` (createMediaField) -> image (non-image media is skipped). */
export const renderMedia: SectionRenderer = (section) => {
  const media = readObject<{ alt?: string | null; imageUrl?: string | null }>(section, "media");
  return media?.imageUrl ? `![${media.alt ?? ""}](${media.imageUrl})` : "";
};

/** `appLink` (createLinkField) -> Markdown link. */
export const renderLink: SectionRenderer = (section, ctx) => {
  const link = readObject<{ href?: string | null; text?: string | null }>(section, "cta");

  if (!link?.href) {
    return "";
  }

  const href = absolutize(link.href, ctx.baseUrl);
  return `[${link.text?.trim() || href}](${href})`;
};

// PROJECT block (extend here): to support another non-factory field, project it under an alias in
// `AgentMarkdownSectionContentFragment` (query.ts), add a renderer here, and slot it into `sectionRenderers`.

const renderHeadline: SectionRenderer = (section) => {
  const headline = readString(section, "headline").trim();
  return headline ? `## ${singleLine(headline)}` : "";
};

const renderCaption: SectionRenderer = (section) => {
  const caption = readString(section, "caption").trim();
  return caption ? `_${singleLine(caption)}_` : "";
};

// The statement section's two tones are one continuous thought, so they serialize as one paragraph;
// the logo wall's metric opens its sentence the same way it does on the page.
const renderStatement: SectionRenderer = (section) => {
  const parts = [readString(section, "metric"), readString(section, "statement"), readString(section, "statementSupport")]
    .map((part) => singleLine(part))
    .filter(Boolean);

  return parts.join(" ");
};

/** `lede` (hero, solution) -> the paragraph under the section's headline. */
const renderLede: SectionRenderer = (section) => singleLine(readString(section, "lede"));

/** `images` (gallery) -> one Markdown image per frame; frames without a resolvable URL are skipped. */
const renderImages: SectionRenderer = (section) => {
  const images = section.images;

  if (!Array.isArray(images)) {
    return "";
  }

  return images
    .map((image) => {
      const { alt, imageUrl } = (image ?? {}) as { alt?: string | null; imageUrl?: string | null };
      return imageUrl ? `![${alt ?? ""}](${imageUrl})` : "";
    })
    .filter(Boolean)
    .join("\n");
};

/** `moments` (team) -> one Markdown image per postcard, captioned where the editor wrote one. */
const renderMoments: SectionRenderer = (section) => {
  const moments = section.moments;

  if (!Array.isArray(moments)) {
    return "";
  }

  return moments
    .map((moment) => {
      const { caption, alt, imageUrl } = (moment ?? {}) as {
        caption?: string | null;
        alt?: string | null;
        imageUrl?: string | null;
      };
      return imageUrl ? `![${singleLine(caption ?? alt ?? "")}](${imageUrl})` : "";
    })
    .filter(Boolean)
    .join("\n");
};

/** `outro` (team) -> the paragraph that closes the section after the moments. */
const renderOutro: SectionRenderer = (section) => singleLine(readString(section, "outro"));

/** `logos` (logo wall) -> the client names as one line; the wall itself is decoration. */
const renderLogos: SectionRenderer = (section) => {
  const logos = section.logos;

  if (!Array.isArray(logos)) {
    return "";
  }

  const names = logos.map((logo) => singleLine(((logo ?? {}) as { name?: string | null }).name ?? "")).filter(Boolean);

  return names.length > 0 ? `Clients: ${names.join(", ")}` : "";
};

/** `items` (solution) -> each numbered column as a sub-heading plus its paragraph. */
const renderItems: SectionRenderer = (section) => {
  const items = section.items;

  if (!Array.isArray(items)) {
    return "";
  }

  return items
    .map((item) => {
      const { title, text } = (item ?? {}) as { title?: string | null; text?: string | null };
      const heading = singleLine(title ?? "");
      const body = singleLine(text ?? "");

      if (!heading) {
        return body;
      }

      return body ? `### ${heading}\n\n${body}` : `### ${heading}`;
    })
    .filter(Boolean)
    .join("\n\n");
};

/** `caseStudies` (case study section) -> one linked row per project, with the services beside it. */
const renderCaseStudies: SectionRenderer = (section, ctx) => {
  const caseStudies = section.caseStudies;

  if (!Array.isArray(caseStudies)) {
    return "";
  }

  return caseStudies
    .map((caseStudy) => caseStudyRow(caseStudy as CaseStudyListItem | null, ctx.baseUrl))
    .filter(Boolean)
    .join("\n");
};

/** `processLanes` (process) -> each lane as a sub-heading plus its steps in order, durations kept. */
const renderProcessLanes: SectionRenderer = (section) => {
  const lanes = section.processLanes;

  if (!Array.isArray(lanes)) {
    return "";
  }

  return lanes
    .map((lane) => {
      const { title, caption, steps } = (lane ?? {}) as ProcessLane;
      const heading = singleLine(title ?? "");

      if (!heading) {
        return "";
      }

      const beats = (steps ?? [])
        .map((step) => {
          const label = singleLine(step?.label ?? "");
          const days = step?.days;

          if (!label) {
            return "";
          }

          return days ? `${label} (${days === 1 ? "1 day" : `${days} days`})` : label;
        })
        .filter(Boolean)
        .join(" -> ");

      const body = [singleLine(caption ?? ""), beats].filter(Boolean).join(": ");

      return body ? `### ${heading}\n\n${body}` : `### ${heading}`;
    })
    .filter(Boolean)
    .join("\n\n");
};

/** `closingTitle` / `closingText` (process) -> the paragraph the section lands on. */
const renderClosing: SectionRenderer = (section) => {
  const title = singleLine(readString(section, "closingTitle"));
  const text = singleLine(readString(section, "closingText"));

  return [title, text].filter(Boolean).join(" ");
};

/** Section renderers in output order: the factory defaults plus this project's `headline` / `caption` / statement. */
export const sectionRenderers: SectionRenderer[] = [
  renderHeadline,
  renderStatement,
  renderLede,
  renderRichText,
  renderMedia,
  renderImages,
  renderMoments,
  renderOutro,
  renderCaption,
  renderLink,
  renderItems,
  renderLogos,
  renderCaseStudies,
  renderProcessLanes,
  renderClosing,
];

function renderSection(section: RawSection, baseUrl: string): string {
  return sectionRenderers
    .map((render) => render(section, { baseUrl }))
    .filter((fragment) => fragment.trim().length > 0)
    .join("\n\n");
}

// The blog index's whole body. Not a page-builder section: it belongs to the `blog` document
// (`AgentMarkdownArticleListFragment` in query.ts), so it is rendered like an article's body would be.
function renderArticleList(page: AgentMarkdownPage, baseUrl: string): string {
  // The projected array, not the heading, says whose index this is: both carry heading + intro.
  if (!Array.isArray(page.articles)) {
    return "";
  }

  const rows = page.articles
    .filter((article): article is ArticleListItem => Boolean(article))
    .map((article) => {
      const title = singleLine(article.title ?? "");
      const uri = (article.uri ?? "").trim();

      if (!title || !uri) {
        return "";
      }

      let row = `- [${title}](${absolutize(uri, baseUrl)})`;
      const description = singleLine(article.description ?? "");

      if (description) {
        row += `: ${description}`;
      }

      const date = (article.publishedAt ?? "").slice(0, 10);

      if (date) {
        row += ` (${date})`;
      }

      return row;
    })
    .filter(Boolean)
    .join("\n");

  const heading = singleLine(page.heading ?? "");
  const intro = renderBlocks(
    (page.intro ?? []).filter((block): block is Block => Boolean(block)),
    baseUrl
  );

  return [heading ? `## ${heading}` : "", intro, rows]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** One work-grid row, shared by the case study section and the work index. */
function caseStudyRow(caseStudy: CaseStudyListItem | null, baseUrl: string): string {
  const title = singleLine(caseStudy?.title ?? "");
  const uri = (caseStudy?.uri ?? "").trim();

  if (!title || !uri) {
    return "";
  }

  const row = `- [${title}](${absolutize(uri, baseUrl)})`;
  const services = (caseStudy?.services ?? []).filter((service): service is string => Boolean(service));

  return services.length > 0 ? `${row}: ${services.join(", ")}` : row;
}

// The work index's whole body, the counterpart to `renderArticleList`: the listing belongs to the
// `work` document (`AgentMarkdownCaseStudyListFragment` in query.ts), not to a page-builder section.
function renderCaseStudyList(page: AgentMarkdownPage, baseUrl: string): string {
  if (!Array.isArray(page.caseStudies)) {
    return "";
  }

  const rows = page.caseStudies
    .map((caseStudy) => caseStudyRow(caseStudy, baseUrl))
    .filter(Boolean)
    .join("\n");

  const heading = singleLine(page.heading ?? "");
  const intro = renderBlocks(
    (page.intro ?? []).filter((block): block is Block => Boolean(block)),
    baseUrl
  );

  return [heading ? `## ${heading}` : "", intro, rows]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

function renderDocumentMeta(page: AgentMarkdownPage): string {
  const bits: string[] = [];

  if (page.author) {
    bits.push(`By ${page.author}`);
  }

  if (page.publishedAt) {
    bits.push(page.publishedAt.slice(0, 10));
  }

  const labels = [...(page.categories ?? []), ...(page.services ?? [])].filter((label): label is string => Boolean(label));

  if (labels.length > 0) {
    bits.push(labels.join(", "));
  }

  return bits.length > 0 ? `_${bits.join(" · ")}_` : "";
}

export function pageToMarkdown(page: AgentMarkdownPage, baseUrl: string): string {
  const uri = page.uri ?? "/";
  const title = page.title?.trim() || titleFromUri(uri);

  const blocks: string[] = [`# ${title}`];

  const meta = renderDocumentMeta(page);

  if (meta) {
    blocks.push(meta);
  }

  if (page.description?.trim()) {
    blocks.push(page.description.trim());
  }

  const articleList = renderArticleList(page, baseUrl);

  if (articleList) {
    blocks.push(articleList);
  }

  const caseStudyList = renderCaseStudyList(page, baseUrl);

  if (caseStudyList) {
    blocks.push(caseStudyList);
  }

  // An article's body: a rich text field on the document, so it renders before any section loop.
  const body = renderBlocks(
    (page.content ?? []).filter((block): block is Block => Boolean(block)),
    baseUrl
  );

  if (body) {
    blocks.push(body);
  }

  for (const section of page.sections ?? []) {
    if (!section) {
      continue;
    }

    const rendered = renderSection(section, baseUrl).trim();

    if (rendered) {
      blocks.push(rendered);
    }
  }

  return `${blocks.join("\n\n")}\n`;
}

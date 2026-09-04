---
name: scaffolding-plop
description: Use when the primary task is generator-first creation of page route, page builder section, or rich text block with plop. Do NOT use when the task is mainly post-scaffold runtime UI or schema/query work without generation.
---

# Scaffolding (Plop)

> Note: the plop generator setup (`plopfile.mjs`, `templates/`, the `plop` script) has not been ported to this Astro repo yet. Until it is, use this skill as the map of what a route/section/block consists of and create the files manually at the paths below.

## Core Rules

- Run `npm run plop` and choose the appropriate generator instead of creating files manually.
- Treat generated output as baseline wiring; do not refactor or remove generator-inserted structure patterns unless the user explicitly requests it.
- Limit post-generation edits to task-specific data, query projections, and rendering. Keep PLOP marker comments (`// PLOP: Add Import`, `// PLOP: Add Export`, `// PLOP: Add Structure`) intact.
- After generation, `npm run sanity:typegen` and format run automatically from Plop (`plopfile.mjs`). If adding a new document type, ensure schema index and structure are updated by the generator.

## Trigger Conditions

Apply this skill when the task is **create/generate/scaffold** for a **page route**, **page builder section**, or **rich text block** using the repo generators (`npm run plop`).

## Execution Checklist

1. Confirm task is create/generate/scaffold for route, page-builder section, or rich-text block.
2. Read only the matching file listed under Reference Files.
3. Run `npm run plop` and select the right generator.
4. Verify generated files and PLOP anchor insertions are present.
5. Apply minimal post-generation changes needed for the task.
6. Validate with `npm run check`.

## Scope Guidance

- If the request includes create/generate/scaffold for a route, section, or block, this skill is the required first step.
- After generation, hand off to sanity for schema/query alignment or to astro for UI behavior.
- After generating a **section**, hand off to **agent-markdown** (`.agents/skills/agent-markdown/SKILL.md`): standard factory fields (`appRichText`, `appMedia`, `appLink`, `headline`, `caption`) serialize to agent Markdown automatically; a bespoke content field needs a branch in `src/features/agents/markdown.ts` and `AgentMarkdownContentQuery`.

## Non-Goals

- Acting as primary skill for pure runtime UI or styling without scaffolding.
- Acting as primary skill for schema/GROQ changes when no new route/section/block is being generated.

## Done Criteria

- All expected generated files exist
- PLOP markers remain intact in edited registries
- No manual reimplementation of generator-owned boilerplate
- Correct handoff called out when work shifts to sanity or astro

## Reference Files

- Read `references/page-route.md` when generating a prefix route (e.g. /articles/[slug], /spaces/[slug]).
- Read `references/page-builder-section.md` when generating a new page builder section.
- Read `references/rich-text-block.md` when generating a new rich text block.
- Do not load unrelated reference files.

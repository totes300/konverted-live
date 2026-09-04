---
name: comments
description: Comment minimalism for this repo. Comments are rare, short, and explain WHY when the reason is non-obvious. Never narrate what the code already says, never write multi-line section banners or per-element/per-field narration, never leave "out of scope for later" notes on empty slots. Applies to `.ts`, `.tsx`, `.astro` ({/* */}), and CSS. Language-level comment policy that extends `code-style`. Use when adding, editing, or reviewing comments, or when asked to trim/clean up comments.
---

# Comments

Comments in this repo are the exception, not the default. Code, names, and types carry the "what". A comment earns its place only when it explains a "why" a reader could not infer from the code itself.

This skill is the authoritative comment policy. `code-style` references it; subsystem skills defer to it.

## Core Rules

- Default to no comment. Prefer a clear name or small refactor over a comment.
- A comment explains WHY, never WHAT. If it restates the next line, delete it.
- Match the surrounding density. Do not be the one file that suddenly grows paragraphs.
- One line, always. If a why needs two lines, cut it to the essential clause or delete it; never wrap onto a second line. No multi-line preambles, no ASCII banners, no section dividers.
- No per-element or per-field narration (one comment per `<div>`, per prop, per slot).
- No "out of scope / for later / TODO-ish" notes on empty slots or placeholders. The empty slot is self-explanatory; if it truly needs tracking, it belongs in an issue, not the markup.
- Keep a comment only when the intent is genuinely non-obvious: a magic number's meaning, a deliberate deviation from the obvious approach, a workaround for an external constraint, a load-bearing ordering.
- `.astro` markup comments use `{/* ... */}`; keep them as scarce as TS comments.
- Do not delete license headers, `@ts-*` / `biome-ignore` directive comments, `aria` rationale, or comments that prevent a real footgun.

## Trigger Conditions

Apply when adding or editing comments in `.ts`, `.tsx`, `.astro`, or CSS, when the user asks to trim/clean/remove comments, or during any readability pass.

## Smell Test (delete if any are true)

- It restates the code on the next line ("Frame decoration, painted behind the content").
- It narrates structure a reader sees ("Content + pinned chrome, above the frame").
- It is a banner or a paragraph explaining the whole file in prose.
- It wraps onto a second line.
- It documents an empty slot/placeholder as "for later".
- Removing it loses nothing a competent reader could not re-derive in seconds.

## Keep Test (a comment is justified when)

- It records WHY a non-obvious choice was made (a deviation, a workaround, an ordering constraint).
- It decodes a magic value (`--cutout-inset` is the top/bottom cutout half-width).
- It is a required directive (`biome-ignore`, `@ts-expect-error`, license header).

## Out of Scope

- Generated files (`sanity/types.ts`, `sanity-schema.json`, `.astro/types.d.ts`): never hand-edit.

## Done Criteria

- Every comment you left passes the Keep Test; everything matching the Smell Test is gone.
- No new multi-line banners, per-field narration, or empty-slot notes were introduced.

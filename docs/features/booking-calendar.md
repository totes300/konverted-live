# Booking Calendar (Cal.com)

The homepage's closing section books a call directly: a Cal.com booker embedded inline, rather than a
form that has to be answered by hand. The lead form section renders it (`leadFormSection`), and the
embed itself is a shared component so any section can carry one.

## The component

`src/components/CalEmbed/CalEmbed.astro` renders the host element and the no-JS fallback;
`CalEmbedElement.ts` mounts the booker. Props:

| Prop        | Meaning                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| `calLink`   | The handle and event type from the Cal.com URL, e.g. `konverted/30min`             |
| `namespace` | Scopes the booker so one page can embed more than one event type, e.g. `30min`     |
| `class`     | The frame around the booker (merged with `cx`)                                     |

```astro
<CalEmbed calLink="konverted/30min" namespace="30min" class="rounded-16 bg-paper-warm p-12" />
```

Both values are editor-owned in Sanity (`calLink`, `calNamespace` on the lead form section) and are
`stegaClean`ed before they reach the element: a stega character inside a booking URL is a 404 rather
than a booking.

## How it loads

- The React package in Cal.com's own docs is not usable here (no React on public pages, see the
  `custom-elements` skill). `@calcom/embed-snippet` is the vanilla equivalent: it injects
  `app.cal.com/embed/embed.js` on first call and queues instructions until that answers.
- The element's module is deferred through `lazyCustomElement` (see [Lazy hydration](../../.agents/skills/lazy-hydration/SKILL.md)),
  so Cal's bundle is fetched only when the section nears the viewport, never on page load.
- One booker per namespace: a second mount of the same namespace is skipped, so a view-transition
  swap cannot stack two iframes.
- The booker's accent (`--cal-brand`) is read from `--color-accent` at mount, so the brand colour
  keeps one definition in `src/styles/colors.css`.

## Without JavaScript

The host renders a **Book a time** button linking to `https://cal.com/<calLink>`, reserving roughly
the height the booker will take. The element hides it once the iframe is in place, so the section
keeps its promise on a page whose third-party script is blocked.

## Changing the event type

Edit **Cal.com link** and **Cal.com namespace** on the section in the Studio. Both come from the
booking URL: `cal.com/konverted/30min` -> link `konverted/30min`, namespace `30min`.

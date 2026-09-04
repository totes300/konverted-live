# MCP Servers

The repo ships project-scoped [MCP](https://modelcontextprotocol.io) servers in **`.mcp.json`** (repo root). MCP clients such as Claude Code pick this file up automatically and ask for a one-time approval per server the first time you open a session in the repo.

They complement each other during development: **chrome-devtools** looks at the app from the outside (a real Chrome rendering the page), **Astro Docs** answers framework questions from the official documentation.

## `chrome-devtools`

[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) lets the agent drive and inspect a live Chrome instance through DevTools. It runs via `npx`, so there is nothing to install beforehand. Typical uses in this repo:

- **Performance**: record traces with lab LCP/CLS/INP plus DevTools insights (LCP breakdown, layout shift culprits, render-blocking requests), run Lighthouse audits, and apply CPU/network throttling. Useful for checking scroll-driven sections and page transitions under load.
- **Animations**: record screencasts (video) of transitions and scroll animations, then review them frame by frame; query `document.getAnimations()` or computed styles mid-animation via script evaluation.
- **Rendering**: screenshots (full page or per element) across viewport sizes, DOM/accessibility snapshots, console messages with source-mapped stack traces, and network request inspection.

### Configured flags

The entry in `.mcp.json` sets:

- `--isolated`: a temporary Chrome profile per launch, cleaned up on close. Keeps performance numbers reproducible (no warm cache or service workers) and keeps agent browsing out of a persistent profile.
- `--viewport=1920x1080`: consistent desktop baseline for screenshots and layout checks.
- `--experimentalScreencast`: enables video recording of the page. Requires **ffmpeg** on `PATH` (`brew install ffmpeg`); without it only the two screencast tools fail, everything else works.
- `--screenshotFormat=jpeg` and `--screenshotMaxWidth=1440`: screenshots enter the agent's context window, so they are compressed and downscaled to stay cheap. Remove the max-width flag if you need pixel-exact captures.
- `--no-usage-statistics`: opts out of the tool's telemetry.

### Requirements and notes

- Node.js LTS and a current stable Chrome; the server launches Chrome itself on first tool use.
- The browser instance is fully exposed to the MCP client: it can inspect and modify anything in that Chrome. The isolated profile keeps this away from personal browsing data; avoid logging into sensitive accounts inside it.
- Performance tools send traced URLs to Google's CrUX API to fetch real-user field data alongside lab results (only public URLs return data; localhost has none). Add `--no-performance-crux` to disable.

## `Astro Docs`

The official Astro documentation MCP server (`https://mcp.docs.astro.build/mcp`, an HTTP server, no local process). It gives the agent searchable access to current Astro docs, so answers about routing, integrations, `astro:env`, view transitions, and adapter behavior match the framework rather than stale training data.

## Example prompts

- "Record a screencast of navigating from the home page to an article on localhost:4321 and check the page transition"
- "Trace localhost:4321 with 4x CPU throttling and report what causes layout shifts"
- "Screenshot the hero section at 375, 768, and 1920 wide and compare"
- "Check the Astro docs for how injectRoute registers on-demand routes"

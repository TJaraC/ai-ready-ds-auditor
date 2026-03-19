# Milestones

## v2.0 Figma-Faithful UI + Enhanced MCP (Shipped: 2026-03-19)

**Phases completed:** 8 phases (6–13), 21 plans

**Key accomplishments:**

- Full architectural refactor: 6 auditors + serialize + MCP adapter + UI state split into independently testable modules; 178 Vitest tests green
- Plugin UI rebuilt pixel-faithful to Figma designs with real-time streaming progress, unpublished component count, and AI Context status banners
- `get_component_specs` v2 with computed visual properties, per-state variants, and source/origin metadata per property
- `get_component_svg` with serialized SVG + metadata; streaming `get_audit_summary` with no-stream fallback
- Fixed two critical MCP usability bugs: publish-status 2-state classification (Figma API has no `master` property); component names use COMPONENT_SET parent name for correct lookups
- Full hardening: copy consistency, button states, error messages, naming consistency across all three packages

---

## v1.0 MVP (Shipped: 2026-03-05)

**Phases completed:** 5 phases, 15 plans

**Key accomplishments:**

- Monorepo scaffold with strict TypeScript, shared types, Vite plugin bundler, ESLint, Prettier, Vitest
- Four audit engines: color hardcoding, typography hardcoding, spacing hardcoding, disconnected components
- Chunked setPluginData injection pipeline with documentchange debounce and Out of Sync indicator
- MCP server with Figma REST client, 429 backoff, in-memory cache, multi-file support
- Four CSS framework formatters: Tailwind v3, CSS Variables, CSS Modules, Styled Components
- Three MCP tools with Zod validation; complete README setup guide

---

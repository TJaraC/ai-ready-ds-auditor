# AI-Ready Design System Auditor

## What This Is

A production-grade DesignOps tool for Non-Enterprise Figma users that bridges Design Systems and AI-powered local IDEs. It consists of two components: a **Figma Plugin** that audits design systems and injects structured data into the file, and a **Local MCP Server** that exposes that data as tools (`get_design_tokens`, `get_component_specs`, `get_component_svg`, `get_audit_summary`) consumable by Trae, Cursor, and other MCP-compatible IDEs — all at zero cost.

Shipped v1.0 with 2,179 LOC TypeScript across three packages (shared, plugin, mcp-server). v2.0 targets a new Figma-faithful UI, enhanced MCP capabilities (streaming, SVG extraction, unpublished component detection), and a full architectural refactor for maintainability.

## Core Value

Any designer using a Non-Enterprise Figma account can connect their Design System to a local AI IDE in under 5 minutes, get live sync indicators when the system drifts, and give the AI full structured context about components, tokens, and audit issues — without paying for Figma Enterprise.

## Requirements

### Validated

- ✓ Monorepo scaffold with shared types, strict TypeScript, ESLint, Prettier — v1.0
- ✓ Dual-build Vite plugin (sandbox + single-file UI) with manifest — v1.0
- ✓ Four auditors: color, typography, spacing, disconnected components — v1.0
- ✓ Chunked setPluginData injection with documentchange debounce — v1.0
- ✓ Two-tab React UI: health dashboard + AI Context tab — v1.0
- ✓ MCP server: Figma REST client, chunk reconstruction, in-memory cache — v1.0
- ✓ Three MCP tools with Zod validation and shared types — v1.0
- ✓ Four CSS framework formatters: Tailwind, CSS Variables, CSS Modules, Styled Components — v1.0
- ✓ Structured error handling: 403, 429 backoff, corrupted chunks, schema mismatch — v1.0
- ✓ Plugin Community assets (128×128 icon, 1920×1080 cover) — v1.0
- ✓ Complete README setup guide (plugin + MCP + Cursor/Trae) — v1.0
- ✓ Zero `any` types, 22/22 tests, 62 kB bundle — v1.0

### Active (v2.0)

**UI — Figma-faithful rebuild:**
- [ ] UI rebuilt pixel-faithful to Figma designs (Audit-1, Audit-2, Config-1 frames)
- [ ] Audit empty state with welcome message, subtitle, primary CTA
- [ ] Audit results state with status banners, metric cards, finding text, accordion categories, primary CTA
- [ ] Configuration state with MCP setup steps, code block, repo link, MCP tools list
- [ ] Streaming active state with real-time progress indicator
- [ ] Unpublished/private components count visible in Audit results
- [ ] AI Context status summary: injected / outdated / missing
- [ ] Configuration: CSS framework selection, file key/connected status, export status
- [ ] Configuration: re-injection guidance, MCP capability summary, new tools section
- [ ] Global states: empty, loading, success, warning, error, no SVG available, component not found
- [ ] Visual language: minimal, monospaced, technical, clean, generous whitespace, consistent CTA

**MCP — Enhanced capabilities:**
- [ ] `get_component_specs` v2: computed visual properties (width, height, paddingX/Y, borderRadius, background, textColor, borderColor, states, source/origin)
- [ ] `get_component_svg`: serialized SVG with metadata for logos, marks, icons
- [ ] `get_audit_summary` streaming with start/progress/chunk/end/error events
- [ ] Unpublished component detection (published / private / local)
- [ ] No-stream fallback mode for streaming tools

**Architecture refactor:**
- [ ] Audit logic separated into discrete modules
- [ ] Export/inject logic separated
- [ ] MCP adaptation layer separated
- [ ] Parsing/serialization separated
- [ ] UI state management separated from rendering
- [ ] All functions small and testable
- [ ] Stable, consistent contracts between layers

**Corrections:**
- [ ] Inconsistent copy fixed
- [ ] Invalid button states fixed
- [ ] Audit/inject/export sync errors fixed
- [ ] Edge cases handled with descriptive errors
- [ ] Naming consistency enforced
- [ ] Missing loading/error states added
- [ ] Oversized MCP outputs chunked properly

### Out of Scope

- Figma Enterprise features — non-Enterprise only, free tier focus
- Cloud/server-hosted MCP — local execution only
- Figma write-back (modify designs from MCP) — read-only
- Real-time WebSocket sync between plugin and MCP — pull-based cache model
- Native mobile app — desktop IDEs only
- Figma REST API write endpoints — read-only
- Component Specs / SVG lookup UI panel — deferred to v2.1 if needed

## Context

**v1.0 shipped 2026-03-05.** Built in 3 days across 5 phases, 15 plans.
**v2.0 started 2026-03-06** on branch `v2.0-development`.

- Tech stack: TypeScript strict, React, Vite (plugin) + Node.js, MCP SDK, Zod (server)
- Distribution: Figma Community (plugin) + local npm install (MCP server)
- Figma free API: 6 GET /v1/files requests/month — session cache is mandatory
- Plugin UI: 62.2 kB gzip (well under 200 kB limit)
- UI source of truth: Figma file (frames Audit-1, Audit-2, Config-1)
- Known: icon/cover images uploaded via Figma publish UI (not manifest)
- v2.0 UI must not be reinvented — must clone Figma structure exactly; extensions follow same visual language

## Constraints

- **Figma API**: Free tier only — 6 GET requests/month, no write access
- **Figma Plugin**: setPluginData() per-key limit of 100kB — chunking threshold at 90kB
- **Auth**: Files must be "Anyone with link can view" for MCP Server to access via API
- **Tech Stack**: TypeScript strict mode, Vite for plugin bundling, Node.js for MCP server
- **Distribution**: Must pass Figma Community review criteria
- **UI Fidelity**: Figma design is source of truth — no free reinterpretation of layout or visual language
- **Git**: v2.0 developed on branch `v2.0-development`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite as plugin bundler | Modern, fast HMR, excellent TS support | ✓ Good — builds in <1s, 62 kB output |
| React for Plugin UI | Ecosystem maturity, component reuse | ✓ Good — clean two-tab UI |
| In-memory cache in MCP Server | Avoids rate limit exhaustion (6 req/month) | ✓ Good — single call per session |
| Multiple files in MCP Server | Multi-brand/multi-file use case | ✓ Good — FIGMA_FILE_KEYS env var |
| All 4 CSS frameworks in v1 | User confirmed all 4 required | ✓ Good — all formatters shipped |
| Chunking threshold at 90kB | Safety margin below 100kB hard limit | ✓ Good — no limit errors hit |
| CJS for MCP server | ESM resolution issues with shared package | ✓ Good — stable Node.js execution |
| `unknown` cast over `any` | Type-safe globalThis access, no eslint-disable | ✓ Good — zero any in codebase |
| icon field NOT in manifest.json | Figma rejects unknown manifest properties | ✓ Good — uploaded via publish UI |
| Tailwind formatter as v3 JS config | v4 @theme CSS syntax not widely supported yet | ✓ Good — works with Cursor/Trae |
| v2.0 UI from Figma source of truth | Ensures design intent is faithfully reproduced | — Pending |
| MCP streaming for heavy operations | Prevents timeout and large payloads | — Pending |
| Branch `v2.0-development` | Isolate v2.0 work from stable v1.0 main | — Pending |

## Current Milestone: v2.0 — Figma-Faithful UI + Enhanced MCP

**Goal:** Rebuild the plugin UI to match the Figma design exactly, add streaming MCP, enhanced component specs with states, SVG extraction, unpublished component detection, and refactor the codebase for long-term maintainability.

**Target features:**
- Figma-faithful UI (Audit-1, Audit-2, Config-1 + v2 extensions)
- `get_component_specs` v2 with computed properties and states
- `get_component_svg` with serialized SVG and metadata
- `get_audit_summary` with MCP streaming
- Unpublished/private component detection
- Full architectural refactor (separated concerns, testable units)
- All UX copy, states, and error handling corrected

---
*Last updated: 2026-03-06 after v2.0 milestone start*

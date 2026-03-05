# AI-Ready Design System Auditor

## What This Is

A production-grade DesignOps tool for Non-Enterprise Figma users that bridges Design Systems and AI-powered local IDEs. It consists of two components: a **Figma Plugin** that audits design systems and injects structured data into the file, and a **Local MCP Server** that exposes that data as three tools (`get_design_tokens`, `get_component_specs`, `get_audit_summary`) consumable by Trae, Cursor, and other MCP-compatible IDEs — all at zero cost.

Shipped v1.0 with 2,179 LOC TypeScript across three packages (shared, plugin, mcp-server).

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

### Active

*(Next milestone — to be defined with /gsd:new-milestone)*

### Out of Scope

- Figma Enterprise features — non-Enterprise only, free tier focus
- Cloud/server-hosted MCP — local execution only
- Figma write-back (modify designs from MCP) — read-only in v1
- Real-time WebSocket sync between plugin and MCP — pull-based cache model
- Native mobile app — desktop IDEs only
- Figma REST API write endpoints — read-only

## Context

**v1.0 shipped 2026-03-05.** Built in 3 days across 5 phases, 15 plans.

- Tech stack: TypeScript strict, React, Vite (plugin) + Node.js, MCP SDK, Zod (server)
- Distribution: Figma Community (plugin) + local npm install (MCP server)
- Figma free API: 6 GET /v1/files requests/month — session cache is mandatory
- Plugin UI: 62.2 kB gzip (well under 200 kB limit)
- Known: icon/cover images uploaded via Figma publish UI (not manifest)

## Constraints

- **Figma API**: Free tier only — 6 GET requests/month, no write access
- **Figma Plugin**: setPluginData() per-key limit of 100kB — chunking threshold at 90kB
- **Auth**: Files must be "Anyone with link can view" for MCP Server to access via API
- **Tech Stack**: TypeScript strict mode, Vite for plugin bundling, Node.js for MCP server
- **Distribution**: Must pass Figma Community review criteria

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

---
*Last updated: 2026-03-05 after v1.0 milestone*

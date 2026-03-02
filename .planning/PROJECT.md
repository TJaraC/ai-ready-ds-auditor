# AI-Ready Design System Auditor

## What This Is

A production-grade DesignOps tool for Non-Enterprise Figma users that bridges the gap between Design Systems and AI-powered local IDEs. It consists of two tightly integrated components: a **Figma Plugin** that audits design systems and injects structured data into the file, and a **Local MCP Server** that exposes that data as tools consumable by Trae, Cursor, and other MCP-compatible IDEs — all at zero cost.

## Core Value

Any designer using a Non-Enterprise Figma account can connect their Design System to a local AI IDE in under 5 minutes, get live sync indicators when the system drifts, and give the AI full structured context about components, tokens, and audit issues — without paying for Figma Enterprise.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Figma Plugin — Core Engine
- [ ] Plugin scans Figma file for components, variables, text styles, and color styles
- [ ] Plugin detects hardcoded colors (fills/strokes with hex/rgb instead of variable references)
- [ ] Plugin detects hardcoded typography (font sizes/weights outside text styles or variables)
- [ ] Plugin detects hardcoded spacing (auto-layout gaps/padding with arbitrary values)
- [ ] Plugin detects disconnected components (layers that should be instances but aren't)
- [ ] Plugin injects scan results as structured JSON via setPluginData()
- [ ] Plugin implements chunking when JSON > 95kB (keys: ai_data_1, ai_data_2, etc.)
- [ ] Plugin uses figma.on("documentchange") with 2s debounce to detect relevant changes
- [ ] Plugin shows 🔴 Out of Sync indicator when design changes detected since last injection

#### Figma Plugin — UI
- [ ] Tab "Audit & Inject": health dashboard + inject/update button
- [ ] Tab "AI Context": CSS framework selector, export JSON button, File ID + metadata field
- [ ] CSS framework selector supports: Tailwind, CSS Variables, CSS Modules, Styled Components/Emotion
- [ ] Clear loading states and error handling throughout UI
- [ ] Production-quality UI suitable for daily designer use

#### MCP Server — Core
- [ ] Connects to Figma REST API (GET /v1/files/:file_key) using free tier token
- [ ] On session start: single API call, reconstructs chunks, caches Design System in memory
- [ ] Avoids redundant API calls while cache is valid
- [ ] Supports multiple Figma files loaded simultaneously
- [ ] Returns clear error with instructions when Figma API returns 403 (permission issue)

#### MCP Server — Tools
- [ ] Tool: get_component_specs — returns specs for a component by name/ID
- [ ] Tool: get_design_tokens — returns color, typography, spacing tokens
- [ ] Tool: get_audit_summary — returns hardcoding issues and inconsistencies detected

#### Quality & DX
- [ ] TypeScript strict mode throughout (plugin + MCP server)
- [ ] Figma API response types fully typed
- [ ] Internal data structures fully typed
- [ ] Vite bundler configured for plugin
- [ ] ESLint + Prettier configured with production-grade rules
- [ ] npm scripts: dev, build, lint, type-check
- [ ] Modular folder structure for maintainability and scalability
- [ ] Ready for publication on Figma Community

### Out of Scope

- Figma Enterprise features — non-Enterprise only, free tier focus
- Cloud/server-hosted MCP — local execution only
- Figma write-back (modify designs from MCP) — read-only in v1
- Real-time WebSocket sync between plugin and MCP — pull-based cache model
- Native mobile app — desktop IDEs only
- Figma REST API write endpoints — read-only

## Context

- The user has the `everything-claude-code` package installed in the project for quality assurance workflows (code review, TypeScript quality, architecture review, testing). These should be leveraged at key phases.
- Target IDEs: Trae and Cursor (both support MCP protocol)
- Figma free API rate limits require conservative calling strategy
- The 100kB setPluginData limit is a hard constraint requiring a chunking strategy
- Plugin will be distributed via Figma Community — must meet their quality bar

## Constraints

- **Figma API**: Free tier only — rate limits apply, no write access
- **Figma Plugin**: setPluginData() per-key limit of 100kB — chunking required above 95kB threshold
- **Auth**: Files must have "Anyone with link can view" permissions for MCP Server to access via API
- **Tech Stack**: TypeScript strict mode, Vite for plugin bundling, Node.js for MCP server
- **Distribution**: Must pass Figma Community review criteria
- **AI Workflow**: Claude Opus for architecture/planning; Claude Sonnet for implementation/refactoring

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite as plugin bundler | Modern, fast HMR, excellent TS support, standard for Figma plugin tooling | — Pending |
| React for Plugin UI | Ecosystem maturity, component reuse, familiar for contributors | — Pending |
| In-memory cache in MCP Server | Avoids rate limit exhaustion; chunks reconstructed once per session | — Pending |
| Multiple files in MCP Server | User confirmed multi-brand/multi-file use case needed in v1 | — Pending |
| All 4 CSS frameworks in v1 | User confirmed all 4 required; affects MCP output formatting logic | — Pending |
| Chunking threshold at 95kB | Safety margin below 100kB Figma hard limit | — Pending |

---
*Last updated: 2026-03-02 after initialization*

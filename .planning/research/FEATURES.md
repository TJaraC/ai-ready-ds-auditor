# Feature Research

**Domain:** DesignOps / Design System Auditing (Figma Plugin + Local MCP Server)
**Researched:** 2026-03-02
**Confidence:** MEDIUM (training data only -- WebSearch, WebFetch, and Bash were unavailable during research; all findings based on domain expertise from training data up to early 2025)

## Feature Landscape

This document covers features for two tightly coupled components:
1. **Figma Plugin** -- scans and audits design systems, injects structured data
2. **Local MCP Server** -- exposes design system data as tools for AI IDEs

---

### Table Stakes: Figma Plugin

Features users expect from any design system audit/lint plugin. Missing these means the product feels broken or incomplete compared to existing tools like Design Lint, Figma Tokens Studio, or Stylelint.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hardcoded color detection | Every design lint tool does this; users scan specifically for non-variable fills/strokes | MEDIUM | Must handle fills, strokes, effects (shadows, glows). Compare against bound variables, NOT just color styles -- Figma Variables are the standard since mid-2023 |
| Hardcoded typography detection | Second most common audit target; fonts/sizes/weights not bound to text styles or variables | MEDIUM | Must detect both text-style disconnection AND variable disconnection for individual properties |
| Disconnected component detection | Core audit capability; instances that were detached or recreated manually | MEDIUM | Compare layer names/structure against library components; flag layers that match component patterns but are not instances |
| Hardcoded spacing detection | Auto-layout gaps/padding with magic numbers instead of variable references | MEDIUM | Only meaningful in auto-layout frames; need to distinguish intentional one-offs from systematic spacing |
| Scan results summary / health dashboard | Users need an at-a-glance view of how "healthy" the file is | LOW | Counts by category, severity breakdown, overall health score/percentage |
| Clear error states and loading indicators | Figma plugin UX standard; long scans need feedback | LOW | Progress bar or spinner during scan; toast/inline errors on failure |
| Re-scan / refresh capability | Users edit and want to re-check without reloading the plugin | LOW | Button to trigger fresh scan; should be fast (incremental if possible) |
| Results filtering and navigation | Users need to find specific issues and jump to them in the canvas | MEDIUM | Click-to-select: clicking an issue selects the offending node in Figma. Filter by issue type, severity, page |
| Page/frame scope selection | Users audit specific pages or frames, not always the entire file | LOW | Dropdown or selector to choose scan scope: whole file, current page, selected frame |
| Export/copy results | Users share audit results with team leads, PMs, or paste into tickets | LOW | Copy to clipboard as JSON or formatted text; export as JSON file |

### Table Stakes: MCP Server

Features any MCP server exposing structured data must have to be useful in AI IDE workflows.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Figma REST API integration (read) | Core data source; must reliably fetch file data | LOW | GET /v1/files/:file_key with personal access token; handle pagination if needed |
| Structured tool interface (MCP protocol) | The entire point; tools must follow MCP spec correctly | MEDIUM | Must implement tools/list and tools/call correctly; return well-formed JSON results |
| get_design_tokens tool | Primary use case: AI needs to know what tokens exist to generate correct code | MEDIUM | Return colors, typography scales, spacing scales, organized by collection/mode |
| get_component_specs tool | AI needs component structure to generate matching implementations | MEDIUM | Return props, variants, slot structure, constraints for a named component |
| get_audit_summary tool | AI needs to understand current design-code drift to prioritize work | LOW | Return issue counts and specific violations from the injected plugin data |
| Error handling with actionable messages | MCP clients show errors to users; cryptic errors kill adoption | LOW | 403 = "File permissions: set to 'Anyone with link can view'"; 404 = "File not found: check file key"; rate limit = "Figma API rate limited, retry in X seconds" |
| In-memory caching | Figma free tier has strict rate limits (~30 req/min); repeated calls must not re-fetch | MEDIUM | Cache per file key; invalidate on explicit refresh or TTL expiry |
| Multi-file support | Users work across multiple Figma files (component library + product files) | MEDIUM | Load and cache multiple files; tools accept file key parameter |
| Chunk reconstruction | Plugin data may be split across multiple pluginData keys | LOW | Reconstruct ai_data_1, ai_data_2, etc. into single JSON payload transparently |

### Table Stakes: Shared / Cross-Cutting

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| TypeScript strict mode | Standard for production tools; required for maintainability | LOW | Already decided in PROJECT.md |
| CSS framework-aware output | Tokens must map to the user's actual framework syntax | MEDIUM | Tailwind classes, CSS custom properties, CSS Modules conventions, styled-components theme. Already scoped to 4 frameworks |
| Clear documentation / setup guide | Users need to go from zero to working in under 5 minutes | LOW | README with token setup, plugin install, MCP config for Cursor/Trae |

---

### Differentiators

Features that set this product apart from existing tools. These are not expected but create significant competitive advantage, especially given the unique "Figma Plugin + MCP Server" bridge approach.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Plugin-to-AI bridge via injected data** | No other tool injects structured DS data into Figma files for MCP consumption. This is the core innovation -- zero-cost Enterprise-like DS context for AI IDEs | HIGH | This IS the product. The combination of inject + MCP read is novel. Competitors either do audit-only OR require Enterprise API |
| **Out of Sync indicator (live drift detection)** | Real-time visual signal that design has changed since last data injection. Designers know when AI context is stale | LOW | figma.on("documentchange") with 2s debounce. Simple to implement, high UX value. No competitor does this for AI context specifically |
| **CSS framework selector with framework-specific token output** | AI gets tokens in the exact format it needs for code generation -- not generic JSON that requires mental translation | MEDIUM | Tailwind config shape, CSS custom properties syntax, etc. Most audit tools output generic JSON; framework-specific output eliminates a translation step for AI |
| **Free tier only / zero cost** | Targets the massive non-Enterprise Figma user base that is locked out of tools like Figma Dev Mode analytics, Variables REST API (Enterprise only), and commercial DS management tools | LOW | Marketing/positioning differentiator. No code complexity, but huge market positioning value |
| **Multi-file context in single MCP session** | AI can reference tokens from a shared library AND see how they are used in a product file simultaneously | MEDIUM | Most tools are single-file. Cross-file context enables AI to say "this component uses token X from library Y" |
| **Severity classification for audit issues** | Not just "you have 47 hardcoded colors" but "12 are critical (brand colors), 35 are minor (one-off illustrations)" | MEDIUM | Heuristic-based: hardcoded brand palette colors = critical; colors not in any token = info. Requires color distance matching |
| **Component variant mapping** | MCP exposes not just component names but full variant property maps so AI can generate correct prop interfaces | HIGH | Parsing Figma component set variant axes into structured prop types. Extremely valuable for AI code generation |
| **Selective token export by collection/group** | Users choose which variable collections to expose to AI (e.g., "only brand tokens, not internal implementation tokens") | LOW | Filter on collection name. Simple UX, prevents AI from being overwhelmed with irrelevant tokens |

---

### Anti-Features (Deliberately NOT Building in v1)

Features that seem appealing but add complexity, blur focus, or create maintenance burden without proportional value.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Real-time WebSocket sync between plugin and MCP** | "The MCP should update instantly when I change the design!" | Massive complexity: requires persistent connection, Figma plugin sandbox limits, local server discovery, conflict handling. Pull-based model is simpler and sufficient for AI coding workflows where context refresh happens at session start | Pull-based: user clicks "Inject" in plugin, MCP reads on next tool call or explicit refresh. The Out of Sync indicator solves the awareness problem |
| **Figma write-back / auto-fix from MCP** | "AI should fix the hardcoded colors directly in Figma" | Write operations via Figma plugin API are destructive and hard to undo in bulk. Mixing read audit with write mutations creates trust issues. Enterprise-grade undo/preview needed | Read-only in v1. Provide fix recommendations in audit output that designers apply manually. Consider write-back as v2 after trust is established |
| **Custom lint rules / rule configuration** | "Let me define my own audit rules" | Rule engine is a product unto itself (see Knapsack, Specify, Interplay). Massive scope creep. v1 should nail the built-in rules first | Ship opinionated built-in rules. If users need custom rules, that is a v2 plugin system |
| **Design-to-code generation within the plugin** | "Generate React components from my Figma designs" | Completely different product (Anima, Locofy, Builder.io territory). The MCP server ENABLES AI to do this, but the plugin should not attempt it | The MCP server gives AI the context. The AI IDE does the code generation. Clean separation of concerns |
| **Token syncing with code repositories** | "Push my tokens to a GitHub repo as JSON/CSS" | Token syncing tools exist (Tokens Studio, Style Dictionary, Specify). Building another one dilutes focus. The MCP server serves tokens to AI which is the novel value | Export tokens as JSON for manual use. Recommend Tokens Studio for repo-sync workflows. Focus on the AI bridge, not token pipeline |
| **Historical audit tracking / trend graphs** | "Show me how design health changed over time" | Requires persistent storage, versioning, database. Plugin data is per-file-version. Massive infrastructure for a "nice chart" | Single point-in-time audit. If trend tracking is needed later, export audit JSON with timestamps and use external tools |
| **Multi-user collaboration features** | "Show who introduced each hardcoded value" | Figma plugin API does not expose edit history per node. Would require version API calls (rate-limit expensive) and user identity tracking | Focus on current state audit. Attribution is not actionable -- fixing the issue is what matters |
| **Support for Sketch, Adobe XD, or Penpot** | "Support other design tools too" | Each tool has completely different APIs, data models, and plugin systems. Figma-first focus is essential for v1 quality | Figma only. Architecture should be clean enough that adapters COULD be written later, but do not build abstractions for hypothetical tools |
| **Cloud-hosted MCP server** | "I want to share the MCP server with my team" | Auth, hosting, multi-tenancy, cost. Completely changes the product from a local dev tool to a SaaS platform | Local only. Each developer runs their own instance. Share the Figma file (which contains injected data) instead |
| **AI-powered design suggestions** | "Tell me what to fix, not just what is wrong" | Requires LLM integration in the plugin itself, adding cost and complexity. The MCP server already enables this by giving context to the user's own AI IDE | Audit identifies problems. AI IDE (via MCP) suggests solutions. The plugin stays lightweight and free |

---

## Feature Dependencies

```
[Figma Scan Engine (hardcoded detection)]
    |
    +--requires--> [Variable/Style Resolution] (must know what tokens exist to identify violations)
    |
    +--produces--> [Audit Results JSON]
                       |
                       +--requires--> [JSON Chunking] (when results > 95kB)
                       |
                       +--injected-via--> [setPluginData injection]
                                              |
                                              +--consumed-by--> [MCP Chunk Reconstruction]
                                                                    |
                                                                    +--feeds--> [get_audit_summary tool]
                                                                    +--feeds--> [get_design_tokens tool]
                                                                    +--feeds--> [get_component_specs tool]

[CSS Framework Selector]
    +--configures--> [Token Output Format]
                         +--consumed-by--> [get_design_tokens tool]

[figma.on("documentchange")]
    +--triggers--> [Out of Sync Indicator]
    +--does NOT trigger--> [Auto re-inject] (user must explicitly re-inject)

[Figma REST API Client]
    +--requires--> [Auth Token Configuration]
    +--requires--> [File Permission Check (403 handling)]
    +--feeds--> [In-Memory Cache]
                    +--feeds--> [All MCP Tools]

[Multi-File Support]
    +--requires--> [In-Memory Cache] (per-file cache keying)
    +--requires--> [File Key Parameter on Tools]
```

### Dependency Notes

- **Scan Engine requires Variable/Style Resolution:** You cannot detect "hardcoded" values without first knowing what the design system tokens ARE. The scan must load all local variables, color styles, text styles, and effect styles before comparing node properties.
- **MCP Tools require Chunk Reconstruction:** Tools cannot return meaningful data until the chunked pluginData is reassembled into a single payload. This is the first operation on session start.
- **CSS Framework Selector configures Token Output:** The framework choice must be persisted (in plugin settings or injected data) so the MCP server knows which format to return tokens in.
- **Out of Sync does NOT trigger auto-injection:** Explicit user action prevents accidental overwrites and rate limit issues. The indicator is informational only.
- **Multi-File requires per-file cache:** Each loaded file has independent cache state, TTL, and token data.

---

## MVP Definition

### Launch With (v1)

Core loop: Audit -> Inject -> Expose to AI

- [ ] **Hardcoded color detection** -- highest signal, most common issue, validates the core audit concept
- [ ] **Hardcoded typography detection** -- second most requested audit, validates multi-category scanning
- [ ] **Hardcoded spacing detection** -- completes the "big three" audit categories
- [ ] **Disconnected component detection** -- structural issue that colors/type cannot catch
- [ ] **JSON injection with chunking** -- the bridge mechanism; without this, the MCP server has nothing to read
- [ ] **Out of Sync indicator** -- low complexity, high UX value; prevents stale AI context
- [ ] **Health dashboard (Audit tab)** -- users need to see results; counts + issue list + click-to-navigate
- [ ] **CSS framework selector (AI Context tab)** -- all 4 frameworks per project requirements
- [ ] **MCP Server with 3 core tools** -- get_design_tokens, get_component_specs, get_audit_summary
- [ ] **In-memory cache with chunk reconstruction** -- prevents rate limit exhaustion
- [ ] **Multi-file support** -- confirmed requirement from project scope
- [ ] **403 error handling with clear instructions** -- critical for onboarding; most common failure mode
- [ ] **Click-to-select navigation from audit results** -- without this, users cannot act on findings

### Add After Validation (v1.x)

- [ ] **Severity classification for audit issues** -- add once base detection is stable and users request prioritization
- [ ] **Component variant mapping** -- add once basic component detection is validated; high value for AI code gen
- [ ] **Selective token export by collection** -- add when users report token overload in AI context
- [ ] **Page/frame scope selection** -- add when users work on large files and full-file scans are too slow
- [ ] **Export/copy audit results** -- add when users need to share with non-plugin users (PMs, leads)
- [ ] **Cache invalidation controls** -- manual refresh button, TTL configuration

### Future Consideration (v2+)

- [ ] **Write-back / auto-fix capabilities** -- only after trust is established through read-only usage
- [ ] **Custom lint rule engine** -- only if community demand is strong and built-in rules are proven
- [ ] **Token sync to code repositories** -- only if the AI bridge model proves insufficient for some workflows
- [ ] **Figma widget companion** -- embed health status directly in the Figma canvas as a persistent widget

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hardcoded color detection | HIGH | MEDIUM | P1 |
| Hardcoded typography detection | HIGH | MEDIUM | P1 |
| Hardcoded spacing detection | HIGH | MEDIUM | P1 |
| Disconnected component detection | HIGH | MEDIUM | P1 |
| JSON injection + chunking | HIGH | MEDIUM | P1 |
| Out of Sync indicator | HIGH | LOW | P1 |
| Health dashboard UI | HIGH | MEDIUM | P1 |
| CSS framework selector | HIGH | MEDIUM | P1 |
| MCP get_design_tokens | HIGH | MEDIUM | P1 |
| MCP get_component_specs | HIGH | HIGH | P1 |
| MCP get_audit_summary | HIGH | LOW | P1 |
| In-memory cache + chunk reconstruction | HIGH | MEDIUM | P1 |
| Multi-file support | MEDIUM | MEDIUM | P1 |
| 403 error handling | HIGH | LOW | P1 |
| Click-to-select navigation | HIGH | LOW | P1 |
| Severity classification | MEDIUM | MEDIUM | P2 |
| Component variant mapping | HIGH | HIGH | P2 |
| Selective token export | MEDIUM | LOW | P2 |
| Page/frame scope selection | MEDIUM | LOW | P2 |
| Export/copy results | LOW | LOW | P2 |
| Cache invalidation controls | LOW | LOW | P2 |
| Write-back / auto-fix | HIGH | HIGH | P3 |
| Custom lint rules | MEDIUM | HIGH | P3 |
| Token repo sync | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- validates core value proposition
- P2: Should have, add once core is stable
- P3: Nice to have, future consideration after product-market fit

---

## Competitor Feature Analysis

| Feature | Design Lint (Plugin) | Tokens Studio | Figma Enterprise (Dev Mode) | Our Approach |
|---------|---------------------|---------------|---------------------------|--------------|
| Color audit | Yes (basic style check) | No (token management focus) | Yes (Variables analytics) | Yes, variable-aware detection |
| Typography audit | Yes (basic) | No | Yes | Yes, style + variable aware |
| Spacing audit | No | No | Partial (inspection) | Yes, auto-layout variable check |
| Component audit | No | No | Yes (usage analytics) | Yes, disconnected instance detection |
| Token management | No | Yes (full CRUD) | Yes (Variables UI) | Read-only exposure, not management |
| AI IDE integration | No | No | No | **Yes -- this is the differentiator** |
| MCP protocol | No | No | No | **Yes -- novel capability** |
| CSS framework mapping | No | Yes (Style Dictionary) | No | Yes, 4 frameworks built-in |
| Free tier | Yes | Freemium | No (paid) | Yes, fully free |
| Multi-file | N/A | Yes | Yes | Yes |
| Real-time sync | No | Partial | Yes | No (pull-based, by design) |
| Custom rules | No | N/A | N/A | No (v1), maybe v2 |
| Auto-fix | No | N/A | N/A | No (v1, read-only) |

**Key insight:** No existing tool bridges Design System audit data into AI IDE context via MCP. This is an unoccupied niche. The closest competitors either audit-only (Design Lint), manage tokens only (Tokens Studio), or require Enterprise (Figma Dev Mode analytics). The combination of audit + structured injection + MCP exposure is genuinely novel.

---

## Sources

- Figma Plugin API documentation (training data, MEDIUM confidence)
- Figma REST API documentation (training data, MEDIUM confidence)
- MCP protocol specification (training data, MEDIUM confidence)
- Design Lint plugin feature set (training data, MEDIUM confidence)
- Tokens Studio feature set (training data, MEDIUM confidence)
- Figma Enterprise Dev Mode capabilities (training data, MEDIUM confidence)

**NOTE:** All web research tools (WebSearch, WebFetch, Bash) were unavailable during this research session. All findings are based on training data (cutoff: early 2025). Key claims to verify before implementation:
1. Figma Variables REST API availability on free tier (may have changed)
2. Current MCP protocol specification for tools/list and tools/call
3. Current Figma plugin API capabilities for documentchange events
4. Competitor feature sets may have evolved since training cutoff

---
*Feature research for: AI-Ready Design System Auditor*
*Researched: 2026-03-02*

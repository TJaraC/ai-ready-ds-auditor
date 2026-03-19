# UI Specification: Plugin UI v2.0

**Source of truth:** Figma file `SXpZVjBDzXFvyl29IYrs1q`, page "Plugin Auditorias Figma"
**Catalogued:** 2026-03-09 via REST API `GET /v1/files/{key}?depth=3`
**Status:** Partial (depth=3 shows structure and top-level properties; inner node content requires a follow-up API call with node IDs)

---

## Plugin Window

**Current v1.0 size:** `{ width: 320, height: 480 }`

**Figma design frames width:** 592px

**Resolution note:** The Figma frames are designed at 592px wide. There are two interpretations:
1. **Design at 2× density** → plugin renders at 296px wide (close to current 320px)
2. **Design at 1× density** → plugin window should be resized to 592px wide

**Evidence favoring 1×:** The `tabs` component is 296×50px and fills the full 592px frame at half-width — this looks like it's designed for 592px. The `card` component is 347px and the `Accordion` is 570px — neither fits a 296px window.

**Decision for Phase 8:** Set plugin window to `{ width: 592, height: 600 }` with vertical scroll for content exceeding 600px. The height is an estimate — Phase 8 must confirm with the designer/user.

---

## Frame Structure

All frames use `layout=VERTICAL`, white fill `rgba(255,255,255)`, and `cornerRadius=20`.

### Audit-1 (Empty State)
- Size: 592×964px
- Structure:
  - `Frame 2` (header/tabs): 592×74px, `layout=HORIZONTAL`, `gap=10`
  - `Frame 3` (body): 592×890px, `layout=VERTICAL`, `padding=24/24/24/24`, `gap=10`
- **Content (Phase 8 must fetch via `/v1/files/{key}/nodes?ids=42:1929` at higher depth):**
  - Tab navigation at top (Audit / Config)
  - Welcome message (headline)
  - Subtitle text
  - Primary CTA button (full-width, red)

### Audit-2 (Results State)
- Size: 592×1581px (tall — scrollable content)
- Structure:
  - `Frame 2` (header/tabs): 592×74px, `layout=HORIZONTAL`, `gap=10`
  - `Frame 13` (status banner area): 592×138px, `layout=VERTICAL`
  - `Frame 3` (body): 592×1369px, `layout=VERTICAL`, `padding=24/24/24/24`, `gap=24`
- **Content (Phase 8 must fetch at higher depth):**
  - Tab navigation
  - Status banner (success/warning/error)
  - Metric cards (issue counts by category)
  - Finding text
  - Accordion list (one per audit category)
  - Primary CTA button

### Config-1 (Configuration State)
- Size: 592×907px
- Structure:
  - `Frame 2` (header/tabs): 592×74px, `layout=HORIZONTAL`, `gap=10`
  - `Frame 3` (body): 592×833px, `layout=VERTICAL`, `padding=24/24/24/24`, `gap=24`
- **Content (Phase 8 must fetch at higher depth):**
  - Tab navigation
  - Numbered MCP setup steps
  - Code block (copy-to-clipboard)
  - Repository link
  - Available MCP tools list
  - Primary CTA button

---

## Component Library (from "Export" page)

All component sets are Figma Component Sets. Phase 8 must fetch children content via node IDs.

### `tabs` (id: 42:1942)
- Base size: 296×50px
- Corner radius: 5px
- **States:**
  | State | Notes |
  |-------|-------|
  | `selected` | 296×50, horizontal layout |
  | `default` | 296×50, horizontal layout, gap=10 |
  | `hover` | 296×50, horizontal layout, gap=10 |

### `button` (id: 42:1974)
- Base size: 217×74px
- Corner radius: 8px
- Padding: 24px all sides
- **States:**
  | State | Fill | Notes |
  |-------|------|-------|
  | `Predeterminada` (default) | `#F55442` (red) | Primary action |
  | `hover` | `#F78C80` (light red) | Hover state |
- **Usage:** Primary CTA in Audit-1, Audit-2, Config-1

### `status` (id: 42:2030)
- Base size: 493×69px
- Padding: 24px all sides
- Corner radius: none (full-width banner)
- **States:**
  | State | Fill | Meaning |
  |-------|------|---------|
  | `Predeterminada` (success/info) | `#2B3C35` (dark green-black) | Healthy / success |
  | `Variante2` (error/warning) | `#E03E1A` (orange-red) | Issues found / error |
- **Usage:** Status banner in Audit-2

### `card` (id: 43:2135)
- Base size: 347×202px
- Corner radius: 8px
- Padding: 24px all sides
- Fill: white `#FFFFFF`
- **States:**
  | State | Notes |
  |-------|-------|
  | `Predeterminada` | Metric card (number + label) |
  | `Variante2` | (Phase 8 must inspect — possibly emphasized/highlighted variant) |
- **Usage:** Metric cards in Audit-2

### `Accordion` (id: 43:2209)
- Closed size: 570×88px
- Open size: 570×390px
- Corner radius: 8px
- Fill: white `#FFFFFF`
- Layout: HORIZONTAL (closed), VERTICAL (open)
- **States:**
  | State | Size | Notes |
  |-------|------|-------|
  | `close` | 570×88 | Collapsed header row |
  | `open` | 570×390 | Expanded with content list |
- **Usage:** Category finding groups in Audit-2

### `accordionItem` (id: 44:2301)
- Size: 510×26px
- Fill: white
- **States:**
  | State | Notes |
  |-------|-------|
  | `default` | Single finding row |
  | `hover` | Highlighted finding row |
- **Usage:** Individual findings inside open `Accordion`

---

## Design Tokens (inferred from component properties)

| Token name | Value | Usage |
|-----------|-------|-------|
| `--color-primary` | `#F55442` | Button default fill |
| `--color-primary-hover` | `#F78C80` | Button hover fill |
| `--color-status-success` | `#2B3C35` | Status banner success |
| `--color-status-error` | `#E03E1A` | Status banner error |
| `--color-surface` | `#FFFFFF` | Cards, accordion, frame backgrounds |
| `--radius-frame` | `20px` | Outer plugin frame |
| `--radius-component` | `8px` | Cards, buttons, accordions |
| `--radius-tabs` | `5px` | Tab component |
| `--spacing-content` | `24px` | Body padding + component padding |
| `--spacing-gap-body` | `24px` | Body section gap (Audit-2, Config-1) |
| `--spacing-gap-header` | `10px` | Header/tab gap |

> ⚠️ These are inferred from visual properties. The Figma file may define Figma Variables for these — Phase 8 must confirm by calling `GET /v1/files/{key}/variables/local`.

---

## Typography

Typography tokens cannot be extracted without deeper Figma API access. Phase 8 must:
- Call `GET /v1/files/{key}/styles` to enumerate text styles
- Or inspect `GET /v1/files/{key}/nodes?ids=42:1929,42:1994,44:2452` at depth=8

**Known from v1.0 (apply until Phase 8 confirms):**
- Font: monospaced (JetBrains Mono or similar — existing plugin used a monospace font)
- The visual language is: "minimal, monospaced, technical, clean, generous whitespace"

---

## Phase 8 API Calls Required

Phase 8 must make these Figma API calls (use environment `FIGMA_TOKEN`):

1. **Get deep node content** (content of all three frames):
   ```
   GET /v1/files/SXpZVjBDzXFvyl29IYrs1q/nodes?ids=42:1929,42:1994,44:2452&depth=8
   ```

2. **Get local text styles**:
   ```
   GET /v1/files/SXpZVjBDzXFvyl29IYrs1q/styles
   ```

3. **Get local variables** (if file uses Figma Variables for tokens):
   ```
   GET /v1/files/SXpZVjBDzXFvyl29IYrs1q/variables/local
   ```

> ⚠️ Free tier allows 6 GET `/v1/files/{key}` calls per month. The `/v1/files/{key}/nodes` and `/v1/files/{key}/styles` endpoints have separate rate limits. Phase 8 researcher should check current limits before making calls.

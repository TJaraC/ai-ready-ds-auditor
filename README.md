# AI-Ready Design System Auditor

Connect your Figma design system to any AI-powered code editor — for free, without a cloud subscription, and without Figma's paid Dev Mode API.

The project is made up of two components that work together: a **Figma plugin** that audits your design system and injects structured data into the file, and a **local MCP server** that reads that data and exposes it as tools for your AI IDE.

**Compatible with:** Cursor, Trae, Claude Desktop, Windsurf, and any other MCP-compatible editor.
**Works on:** Figma free Starter plan and above.

---

## Table of Contents

- [How it works](#how-it-works)
- [What it detects and exports](#what-it-detects-and-exports)
- [MCP tools reference](#mcp-tools-reference)
- [Installation](#installation)
- [IDE configuration](#ide-configuration)
- [Figma API rate limits](#figma-api-rate-limits)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

## How it works

```
Figma file
    │
    ▼
[Plugin: Audit & Inject]
    Scans every component in your design system
    Detects hardcoded values and disconnected components
    Writes structured JSON into Figma pluginData (chunked, no file size limit)
    │
    ▼
Figma REST API  ←  one call per session, then cached
    │
    ▼
[MCP Server: runs locally on your machine]
    Reads the pluginData chunks via REST
    Reconstructs and caches the full report in memory
    Exposes 4 tools: tokens · component specs · audit issues · component SVGs
    │
    ▼
Cursor / Trae / Claude Desktop / …
    AI agent calls the tools by name
    Receives structured token data, component specs, or audit issues
    Uses the context to generate code, suggest fixes, or answer questions
```

No data leaves your machine except for the one Figma REST API call to read the pluginData you already own.

---

## What it detects and exports

### Audit: 6 categories of design debt

The plugin scans every layer inside every COMPONENT definition in your file and flags:

#### Color
- **Hardcoded fills** — SOLID fill colors not bound to a color variable or paint style
- **Hardcoded strokes** — SOLID stroke colors not bound to a color variable or paint style

#### Typography
- **Hardcoded font sizes** — Text nodes with no text style and an unbound fontSize
- **Hardcoded font weights** — Unbound fontWeight on text nodes that also lack a text style
- **Hardcoded line heights** — Non-AUTO line heights not bound to a variable
- **Hardcoded letter spacing** — Non-zero letter spacing not bound to a variable

#### Spacing
- **Hardcoded padding** — paddingLeft/Right/Top/Bottom values not bound to variables on auto-layout frames
- **Hardcoded gap** — itemSpacing (gap) values not bound to variables on auto-layout frames
- Zero values are always skipped (intentional, not missing tokens)

#### Border
- **Hardcoded corner radius** — cornerRadius values not bound to a variable (mixed corners audited individually)
- **Hardcoded stroke weight** — strokeWeight not bound to a variable

#### Effects
- **Hardcoded shadows** — Drop shadows and inner shadows with no effect style applied
- **Hardcoded blurs** — Layer blurs and background blurs with no effect style applied

#### Components
- **Disconnected components** — FRAME or GROUP nodes whose name matches a component in the design system but are not an INSTANCE of it

Each issue includes the node ID, node name, page name, offending value, and a suggested fix. You can click any issue in the plugin to jump directly to that node on the canvas.

---

### Token extraction

In addition to the audit, the plugin extracts all your design tokens from Figma Variables and Text Styles:

| Token type | Source in Figma |
|---|---|
| Colors | COLOR-type variables |
| Spacing | FLOAT variables with spacing scopes |
| Border radius | FLOAT variables with CORNER_RADIUS scope |
| Border width | FLOAT variables with STROKE_FLOAT scope |
| Font size | FLOAT variables with typography scopes + Text Styles |
| Font weight | FLOAT/STRING variables with typography scopes + Text Styles |
| Line height | FLOAT variables with typography scopes + Text Styles |
| Letter spacing | FLOAT variables with typography scopes |
| Font family | STRING variables with font family scope + Text Styles |

---

### Component specs

For every component in your design system, the plugin captures:

- **Full layer tree** — Recursive tree of all child layers with their types, dimensions, fills, strokes, spacing, and typography. Each property includes a `source` field (`"variable"`, `"style"`, or `"hardcoded"`) so the AI knows what is intentional.
- **Variants** — All variant groups and their possible values (e.g. `Size: [sm, md, lg]`, `State: [default, hover, active]`)
- **Interaction states** — Full layer tree for each state variant, so the AI can compare default vs hover vs disabled
- **SVG export** — Visual representation of the component as SVG markup with viewBox

---

### CSS framework output

When you request tokens from the MCP server, you choose the output format:

**Tailwind CSS** — JavaScript config object for `theme.extend`:
```js
{
  "theme": {
    "extend": {
      "colors": { "primary": "#0A84FF", "neutral-900": "#1C1C1E" },
      "spacing": { "4": "16px", "6": "24px" },
      "borderRadius": { "sm": "4px", "lg": "12px" },
      "fontSize": { "body": "14px", "heading-1": "32px" },
      "fontWeight": { "regular": "400", "bold": "700" }
    }
  }
}
```

**CSS Variables** — Custom properties in `:root`:
```css
:root {
  --primary: #0A84FF;
  --neutral-900: #1C1C1E;
  --spacing-4: 16px;
  --border-radius-sm: 4px;
}
```

**CSS Modules** — Typed JavaScript/TypeScript exports:
```ts
export const colors = { primary: '#0A84FF', neutral900: '#1C1C1E' };
export const spacing = { s4: '16px', s6: '24px' };
export const borderRadius = { sm: '4px', lg: '12px' };
```

**Styled Components** — Theme object for `ThemeProvider`:
```ts
export const colors = { primary: '#0A84FF', neutral900: '#1C1C1E' };
export const spacing = { s4: '16px', s6: '24px' };
```

---

## MCP tools reference

Once the server is running your IDE's AI agent can call four tools:

### `get_design_tokens`

Returns all design tokens formatted for your chosen CSS framework.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `fileKey` | string | first configured file | Which Figma file to query |
| `framework` | string | `"tailwind"` | Output format: `"tailwind"` · `"css-variables"` · `"css-modules"` · `"styled-components"` |

**Example prompts:**
- "Show me all design tokens as a Tailwind config"
- "Generate CSS variables from our design system"
- "Create a theme file for styled-components"

---

### `get_component_specs`

Returns the full specification for a component: layer tree, variants, states, and dimensions.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `fileKey` | string | first configured file | Which Figma file to query |
| `componentName` | string | — | Case-insensitive partial name match |
| `componentId` | string | — | Exact Figma node ID (takes precedence over name) |

**Example prompts:**
- "What variants does the Button component have?"
- "Show me the layer structure of the Card component"
- "What's the padding inside the Input component?"

If the component is not found, the tool returns a list of all available component names to help you refine the query.

---

### `get_audit_summary`

Returns all audit issues, optionally filtered by category.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `fileKey` | string | first configured file | Which Figma file to query |
| `category` | string | all categories | Filter: `"color"` · `"typography"` · `"spacing"` · `"border"` · `"effects"` · `"component"` |

**Example prompts:**
- "What hardcoded color values exist in the design system?"
- "List all components with disconnected instances"
- "Show me spacing issues on the Button component"

Each issue in the response includes: nodeId, nodeName, pageName, issueType, offendingValue, and suggestedFix.

This tool supports streaming — if your client supports MCP notifications, issues are sent category by category as they are processed.

---

### `get_component_svg`

Returns the SVG markup for a component, useful for giving the AI a visual reference.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `fileKey` | string | first configured file | Which Figma file to query |
| `componentName` | string | — | Case-insensitive partial name match |
| `componentId` | string | — | Exact Figma node ID (takes precedence over name) |

**Example prompts:**
- "Show me what the Checkbox component looks like"
- "Give me the SVG for the Alert component"

The response includes the SVG string and its viewBox. If the SVG was not captured during the last audit, the tool will indicate that and ask you to re-run the plugin.

---

## Installation

> **Note:** The plugin is not yet available on the Figma Community marketplace. For now, you install it directly from this repository as a local development plugin. Follow the steps below — it only takes a few minutes.

### Step 1 — Prerequisites

Make sure you have the following installed:

- **Figma Desktop** (the desktop app, not the browser version — required for running local plugins)
- **Node.js 18 or later** — check with `node --version`
- **Git**

You do not need a paid Figma plan. The free Starter plan works.

---

### Step 2 — Clone and build the project

Open a terminal and run:

```bash
git clone https://github.com/TJaraC/ai-ready-ds-auditor.git
cd ai-ready-ds-auditor
npm install
npm run build
```

When the build completes you will have two compiled artifacts:

| Artifact | Path | Used by |
|---|---|---|
| Plugin manifest | `packages/plugin/manifest.json` | Figma (to load the plugin) |
| MCP server | `packages/mcp-server/dist/index.js` | Your IDE |

---

### Step 3 — Install the plugin in Figma Desktop

1. Open **Figma Desktop**
2. Go to the menu: **Main menu → Plugins → Development → Import plugin from manifest…**
3. Navigate to the cloned folder and select: `packages/plugin/manifest.json`
4. Click **Open**

The plugin now appears under **Main menu → Plugins → Development → AI-Ready DS Auditor**. You can also right-click on the canvas and find it under **Plugins → Development**.

> You only need to import the manifest once. Figma remembers it across sessions.

---

### Step 4 — Get a Figma Personal Access Token

The MCP server reads data from Figma's REST API on your behalf. It needs a read-only personal access token.

1. In Figma, click your avatar (top-left) → **Settings**
2. Go to **Security → Personal access tokens**
3. Click **Generate new token**
4. Give it a name (e.g. "AI DS Auditor")
5. Set the scope to `file_content:read` — read-only is all that is needed
6. Click **Generate token** and copy it — it starts with `figd_`

Store this token somewhere safe; you will use it in the IDE configuration below.

---

### Step 5 — Get your Figma file key

The file key identifies which Figma file the MCP server will read.

Open your design system file in the browser. The URL looks like this:

```
https://www.figma.com/design/XXXXXXXXXXXX/Your-File-Name
```

The segment `XXXXXXXXXXXX` between `/design/` and the next `/` is your file key.

> After running the plugin for the first time, the file key also appears on the **Config** tab inside the plugin.

**Important:** The file must be set to "Anyone with the link can view" so that the API can read it. In Figma, click **Share** and check that the link permission is set to public view access. The MCP server only ever reads data — it cannot write to your file.

---

### Step 6 — Run the plugin on your design system

1. Open your design system Figma file in **Figma Desktop**
2. Open the plugin: **Main menu → Plugins → Development → AI-Ready DS Auditor**
3. On the **Audit** tab, click **Audit & Inject**
4. The plugin scans every component in the file (progress shown page by page) and then injects the structured data

When it finishes, the dashboard shows:
- Total design token count
- Total component count (with a badge if some are unpublished)
- Issue count by category
- A green status banner confirming data was injected

You need to re-run **Audit & Inject** after making design changes. The plugin shows an orange "out of sync" banner when it detects that the file has changed since the last injection.

---

### Step 7 — Configure your IDE

See the [IDE configuration](#ide-configuration) section below for detailed instructions for each supported editor.

---

## IDE configuration

The MCP server runs as a local Node.js process. You configure it in your IDE by pointing it at the compiled `index.js` file and providing your token and file key as environment variables.

**You need two values:**
- The **absolute path** to `packages/mcp-server/dist/index.js` on your machine
- Your **Figma Personal Access Token** (from Step 4)
- Your **Figma file key** (from Step 5)

---

### Cursor

Create or edit the file `.cursor/mcp.json` inside your project folder (project-scoped), or `~/.cursor/mcp.json` (global — applies to all projects):

```json
{
  "mcpServers": {
    "ai-ds-auditor": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/ai-ready-ds-auditor/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "YOUR_FIGMA_FILE_KEY"
      }
    }
  }
}
```

**macOS / Linux example:**
```json
"args": ["/Users/yourname/projects/ai-ready-ds-auditor/packages/mcp-server/dist/index.js"]
```

**Windows example:**
```json
"args": ["C:/Users/yourname/projects/ai-ready-ds-auditor/packages/mcp-server/dist/index.js"]
```

After saving, reload the MCP server: **Cursor → Settings → MCP** or open the Command Palette and search for "Reload MCP Servers".

---

### Trae

Open Trae settings and navigate to **MCP Servers**, or create/edit your `mcp.json` configuration file.

Trae uses an **array** format and combines the command and arguments into a single array:

```json
{
  "mcpServers": [
    {
      "name": "ai-ds-auditor",
      "command": ["node", "/ABSOLUTE/PATH/TO/ai-ready-ds-auditor/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "YOUR_FIGMA_FILE_KEY"
      }
    }
  ]
}
```

Note the differences from the Cursor format:
- `mcpServers` is an array `[...]`, not an object `{...}`
- `command` is an array containing both the executable and the path
- `name` is a separate string field

---

### Claude Desktop

Edit the Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-ds-auditor": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/ai-ready-ds-auditor/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "YOUR_FIGMA_FILE_KEY"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

### Windsurf and other MCP-compatible editors

Use the same `command`, `args`, and `env` values shown above. Refer to your editor's documentation for where to place the MCP server configuration.

---

### Multiple Figma files

You can configure the server to serve multiple design system files simultaneously. Separate file keys with commas:

```json
"FIGMA_FILE_KEYS": "fileKey1,fileKey2,fileKey3"
```

All four MCP tools accept an optional `fileKey` parameter to specify which file to query. If omitted, the first key in the list is used as the default.

---

### Verify the server is working

Run this in a terminal to confirm the server starts correctly:

```bash
node /absolute/path/to/packages/mcp-server/dist/index.js
```

It should start and wait for input (no error output). Press Ctrl+C to stop it. If it throws an error, check that `npm run build` completed without errors and that the path is correct.

---

## Figma API rate limits

The free Figma Starter plan has a limit of **6 REST API calls per month per file**.

The MCP server is designed to stay well within this limit:
- It makes **one API call per file when it starts** (or on the first tool call for that file)
- The result is cached in memory for the entire session
- Every subsequent tool call within the same session uses the cache — zero additional API calls

**In practice:** as long as you do not restart the MCP server repeatedly, you will rarely use more than 1–2 calls per month per file.

If you do hit the monthly limit, the server returns a clear error message and does not crash. You can either wait until the next calendar month resets your quota, or upgrade to Figma Professional.

---

## Troubleshooting

**403 error when the MCP server starts**

The Figma file is not publicly accessible. In Figma, click **Share** and change the link permission to "Anyone with the link can view". Only view access is needed.

**"Schema version mismatch" or "re-inject required" error**

The data in the file was written by an older version of the plugin. Open the plugin in Figma Desktop, click **Audit & Inject**, and let it complete. Then retry the tool call.

**"No data found" from MCP tools**

The plugin has not been run yet, or was run but did not complete injection. Open the plugin, click **Audit & Inject**, wait for the green banner, then retry.

**Orange "out of sync" banner in the plugin**

The design file changed after the last injection. Click **Audit & Inject** again to refresh the data. The MCP server will continue serving the previous (stale) data until you re-inject and restart the server session.

**Tool calls return stale data after design changes**

The MCP server caches data for the entire session. After re-injecting from the plugin, restart the MCP server (or reload it in your IDE settings) so it fetches the updated data from Figma.

**Rate limit error (429)**

You have exhausted the monthly API quota for that file on the free plan. The server will show a descriptive error. Options: wait until next month, reduce server restarts, or upgrade to Figma Professional.

**Wrong path error in IDE**

The `args` path must be an absolute path to `packages/mcp-server/dist/index.js`. Verify it exists:

```bash
# macOS/Linux
ls /your/absolute/path/packages/mcp-server/dist/index.js

# Windows (PowerShell)
Test-Path "C:\your\absolute\path\packages\mcp-server\dist\index.js"
```

If the file does not exist, run `npm run build` from the project root.

**Plugin not visible in Figma**

Make sure you are using **Figma Desktop** (not the browser). The plugin is installed under **Main menu → Plugins → Development** — not in the general Plugins list, because it is a local development plugin.

**Figma shows "Cannot connect to plugin" or sandbox error**

Close the plugin, run `npm run build` again from the project root, then reopen the plugin in Figma. If the error persists, close Figma Desktop completely and reopen it.

---

## Development

```bash
npm run dev         # Watch mode for all packages
npm run build       # Build all packages (plugin + shared + mcp-server)
npm run type-check  # TypeScript strict check across all packages (zero errors required)
npm run lint        # ESLint across all packages (zero errors required)
npm test            # Vitest unit tests
```

**Project structure:**

```
packages/
  plugin/      — Figma plugin (TypeScript + React + Vite)
  mcp-server/  — Local MCP server (Node.js + TypeScript)
  shared/      — Shared types and interfaces
```

---

## License

MIT

# AI-Ready Design System Auditor

Connect your Figma Design System to any MCP-compatible AI IDE for free. The plugin audits your Figma file for hardcoded values and disconnected components, injects structured data, and exposes it as three MCP tools — all without a cloud subscription.

**For:** Non-Enterprise Figma users who want AI-assisted design system work without paying for Figma's Dev Mode API.

## What it does

- Audits your Figma file for hardcoded colors, typography, spacing, and disconnected components
- Injects structured token + component data into the Figma file via pluginData
- Exposes that data to any MCP-compatible AI IDE as three local MCP tools
- No cloud, no subscription — works on the free Figma Starter plan

---

## Prerequisites

- Figma Desktop (free Starter plan works)
- Node.js 18 or later
- Any MCP-compatible AI IDE (Cursor, Trae, Claude Desktop, Windsurf, etc.)

---

## Step 1 — Install the plugin

Open Figma Desktop, then go to **Resources → Plugins** and search for **"AI-Ready DS Auditor"**.

Alternatively, find it on the Figma Community page by searching "AI-Ready DS Auditor".

---

## Step 2 — Get a Figma Personal Access Token

1. In Figma, open **Account Settings** (click your avatar → Settings)
2. Go to **Security → Personal access tokens**
3. Click **Generate new token**
4. Set the scope to `file_content:read` (read-only is sufficient)
5. Copy the token — it starts with `figd_`

Keep this token; you will need it in the MCP server configuration below.

---

## Step 3 — Get your Figma file key

The file key is a unique identifier embedded in the Figma file URL.

Open the file in your browser. The URL follows this pattern:

```
https://www.figma.com/design/XXXXXXXXXXXX/FileName
```

The `XXXXXXXXXXXX` segment is the file key.

**Alternative:** Run the plugin, go to the "AI Context" tab — the **File ID** field displays the key after you have run an injection.

---

## Step 4 — Run the plugin (audit and inject)

1. Open your Figma file that contains the Design System
2. Open the plugin: **Resources → Plugins → AI-Ready DS Auditor**
3. Click **"Inject / Update"** — the plugin scans the file and writes structured data into pluginData
4. The health dashboard shows total tokens, component count, and audit issues found

**Status indicators:**
- Green checkmark — data is injected and current
- Orange warning — data exists but is out of sync with recent design changes (click "Inject / Update" again after making design changes)

---

## Step 5 — Build and configure the MCP server

Clone the repository and build all packages:

```bash
git clone https://github.com/YOUR_USERNAME/ai-ready-ds-auditor.git
cd ai-ready-ds-auditor

npm install
npm run build
```

After the build completes, the MCP server entry point is:

```
packages/mcp-server/dist/index.js
```

You will reference this file with an **absolute path** in your IDE configuration below.

---

## Step 6 — Configure your IDE

Works with any IDE that supports the MCP protocol. Below are examples for Cursor and Trae — for other IDEs, refer to their MCP configuration docs and use the same `command`, `args`, and `env` values.

### Cursor

Create or edit `.cursor/mcp.json` in your project directory, or `~/.cursor/mcp.json` for a global configuration:

```json
{
  "mcpServers": {
    "ai-ds-auditor": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "YOUR_FIGMA_FILE_KEY"
      }
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/` with the full path to your cloned repository.

**Example on macOS/Linux:**
```json
"args": ["/Users/alice/projects/ai-ready-ds-auditor/packages/mcp-server/dist/index.js"]
```

**Example on Windows:**
```json
"args": ["C:/Users/alice/projects/ai-ready-ds-auditor/packages/mcp-server/dist/index.js"]
```

**Multiple Figma files:** Separate file keys with commas:
```json
"FIGMA_FILE_KEYS": "KEY1,KEY2,KEY3"
```

After saving the config, reload the MCP server in Cursor (Cursor → Settings → MCP or use the Command Palette: "Reload MCP Servers").

---

### Trae

Open Trae settings and navigate to the MCP Servers section, or create/edit your `mcp.json` configuration file.

Trae uses an **array** format for `mcpServers`, and the `command` field combines the executable and arguments into a single array:

```json
{
  "mcpServers": [
    {
      "name": "ai-ds-auditor",
      "command": ["node", "/ABSOLUTE/PATH/TO/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "YOUR_FIGMA_FILE_KEY"
      }
    }
  ]
}
```

Replace `/ABSOLUTE/PATH/TO/` with the full path to your cloned repository.

**Key differences from Cursor:**
- `mcpServers` is an array (`[...]`) not an object (`{...}`)
- `command` is an array containing both the executable and its arguments (`["node", "/path/to/index.js"]`)
- `name` is a separate string field, not used as the object key

---

## Available MCP tools

Once the server is running, your IDE's AI agent can call these three tools.

### `get_design_tokens`

Returns design tokens (colors, typography, spacing) formatted for your CSS framework.

**Parameters:**
- `fileKey` (optional) — which Figma file to query; defaults to the first file in `FIGMA_FILE_KEYS`
- `framework` (optional) — output format: `"tailwind"` | `"css-variables"` | `"css-modules"` | `"styled-components"`; defaults to `"css-variables"`

**Example prompt:**
> "Show me all the design tokens as a Tailwind config"

The agent calls `get_design_tokens` with `framework: "tailwind"` and returns a `theme.extend` object with colors, font sizes, and spacing values.

---

### `get_component_specs`

Returns the full specification for a component by name or ID.

**Parameters:**
- `componentName` (optional) — search by component name (case-insensitive partial match)
- `componentId` (optional) — look up by Figma node ID
- `fileKey` (optional) — which file to query

**Example prompt:**
> "What props does the Button component have?"

The agent calls `get_component_specs` with `componentName: "Button"` and returns the component name, description, variants, and usage notes.

---

### `get_audit_summary`

Returns audit issues filtered by category.

**Parameters:**
- `fileKey` (optional) — which file to query
- `category` (optional) — filter by issue type: `"color"` | `"typography"` | `"spacing"` | `"component"`

**Example prompt:**
> "What are the hardcoded color issues in this design system?"

The agent calls `get_audit_summary` with `category: "color"` and returns a list of nodes using hardcoded fill or stroke values instead of color variables, including node IDs and suggested fixes.

---

## Figma API rate limits

The free Figma Starter plan allows **6 GET requests per month per file** to the Figma REST API.

The MCP server fetches each file once per server session and caches the result in memory. Subsequent tool calls within the same session do not make additional API requests.

**To avoid exhausting your monthly quota:**
- Keep the MCP server process running rather than restarting it repeatedly
- Each new server start consumes one API call per configured file
- If you do hit the monthly limit, the server returns a clear error message; wait until the next calendar month or upgrade to Figma Professional

---

## Troubleshooting

**403 Forbidden error from the MCP server**

The Figma file must be set to public read access. In Figma, click **Share**, then change the link permission to "Anyone with the link can view".

**"Out of sync" indicator in the plugin**

Design changes were made after the last injection. Click "Inject / Update" in the plugin to update the pluginData.

**"No data found" from the MCP server**

The MCP server reads data written by the plugin. If you have not run "Inject / Update" yet, no data exists for the server to read. Run the plugin first, then retry the tool call.

**Token data is empty after restarting the IDE**

The MCP server's in-memory cache is session-scoped. Each new server session makes a fresh API call to Figma. This is expected behavior and does not indicate a problem; the cache refills automatically on the first tool call.

**Rate limit error (monthly quota exhausted)**

The Figma free plan allows 6 REST API calls per month per file. The server will return a descriptive error if this limit is reached. Wait until the next calendar month, or avoid restarting the server unnecessarily (see the rate limits section above).

**Wrong absolute path in IDE config**

The `args` path (Cursor) or `command` array path (Trae) must be an absolute path to `packages/mcp-server/dist/index.js`. If the path contains spaces, ensure it is properly quoted. Verify the path exists by running `node /path/to/packages/mcp-server/dist/index.js` in a terminal — it should start and wait for input.

---

## Development

```bash
npm run dev        # Watch mode for all packages
npm run build      # Build all packages
npm run type-check # TypeScript check across all packages (zero errors required)
npm run lint       # ESLint across all packages (zero errors required)
npm test           # Vitest unit tests
```

**Project structure:**
```
packages/
  plugin/       — Figma plugin (TypeScript + React + Vite)
  mcp-server/   — Local MCP server (Node.js + TypeScript)
  shared/       — Shared types and utilities
```

---

## How the pipeline works

```
Figma file
    |
    v
[Plugin: Audit & Inject]
    Scans components, tokens, variables
    Finds hardcoded colors / typography / spacing / disconnected layers
    Writes chunked JSON to Figma pluginData
    |
    v
Figma REST API (one call per session)
    |
    v
[MCP Server: local process]
    Reads pluginData chunks via REST
    Reconstructs and caches in memory
    Exposes get_design_tokens / get_component_specs / get_audit_summary
    |
    v
Cursor / Trae AI agent
    Calls tools by name
    Receives formatted token output, component specs, or audit issues
```

---

## License

MIT

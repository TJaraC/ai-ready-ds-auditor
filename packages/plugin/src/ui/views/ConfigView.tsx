import React, { useState } from 'react';
import type { AuditReport } from '@shared/types';
import type { CssFramework } from '../state';
import { Button } from '../components/Button';
import { StatusBanner } from '../components/StatusBanner';
import { BANNER_COPY } from '../banner-copy';
import {
  COLOR_BG_SECONDARY,
  COLOR_PRIMARY,
  COLOR_TEXT,
  COLOR_TEXT_SECONDARY,
  RADIUS_COMPONENT,
  SPACING_CONTENT,
  SPACING_GAP_BODY,
  SPACING_GAP_HEADER,
} from '../tokens';

// ---------------------------------------------------------------------------
// MCP configuration snippet (locked copy)
// ---------------------------------------------------------------------------

const MCP_CONFIG_SNIPPET = `{
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
}`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfigViewProps {
  report: AuditReport | null;
  onExportJson: () => void;
  cssFramework: CssFramework;
  onCssFrameworkChange: (fw: CssFramework) => void;
  contextStatus: 'injected' | 'outdated' | 'missing' | null;
}

// ---------------------------------------------------------------------------
// ConfigView
// ---------------------------------------------------------------------------

export function ConfigView({
  report,
  onExportJson,
  cssFramework,
  onCssFrameworkChange,
  contextStatus,
}: ConfigViewProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(MCP_CONFIG_SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Derive banner from contextStatus — centralized in banner-copy.ts
  const bannerEntry = contextStatus !== null ? BANNER_COPY[contextStatus] : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Status banner — TOP, outside scroll area */}
      {bannerEntry !== null && (
        <StatusBanner variant={bannerEntry.variant} message={bannerEntry.message} />
      )}

      {/* Scrollable content area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: SPACING_CONTENT,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING_GAP_BODY,
          boxSizing: 'border-box',
        }}
      >
      {/* Section 1: CSS Framework selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING_GAP_HEADER }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: COLOR_TEXT,
          }}
        >
          CSS Framework
        </label>
        <p
          style={{
            fontSize: 11,
            margin: 0,
            color: COLOR_TEXT_SECONDARY,
            fontFamily: 'monospace',
          }}
        >
          Format used for MCP export
        </p>
        <select
          value={cssFramework}
          onChange={(e) => onCssFrameworkChange(e.target.value as CssFramework)}
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: COLOR_TEXT,
            background: COLOR_BG_SECONDARY,
            border: `1px solid ${COLOR_TEXT_SECONDARY}`,
            borderRadius: RADIUS_COMPONENT,
            padding: '6px 8px',
            width: '100%',
          }}
        >
          <option value="tailwind">Tailwind CSS</option>
          <option value="css-variables">CSS Variables</option>
          <option value="css-modules">CSS Modules</option>
          <option value="styled-components">Styled Components</option>
        </select>
      </div>

      {/* Section title */}
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'monospace',
          margin: 0,
          color: COLOR_TEXT,
        }}
      >
        MCP Server Setup
      </h2>

      {/* Numbered setup steps */}
      <ol
        style={{
          paddingLeft: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING_GAP_HEADER,
          margin: 0,
        }}
      >
        <li style={{ fontSize: 13, fontFamily: 'monospace', color: COLOR_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Get a Figma Personal Access Token
        </li>
        <li style={{ fontSize: 13, fontFamily: 'monospace', color: COLOR_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Get your Figma file key
        </li>
        <li style={{ fontSize: 13, fontFamily: 'monospace', color: COLOR_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Run the plugin, audit &amp; inject
        </li>
        <li style={{ fontSize: 13, fontFamily: 'monospace', color: COLOR_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Build and configure the MCP server{' '}
          <a href="https://github.com/TJaraC/ai-ready-ds-auditor" style={{ color: COLOR_PRIMARY }}>
            GitHub repo
          </a>
        </li>
        <li style={{ fontSize: 13, fontFamily: 'monospace', color: COLOR_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Add to mcp.json (Replace /ABSOLUTE/PATH/TO/ with the full path to your cloned repository.)
        </li>
      </ol>

      {/* Code block */}
      <div style={{ position: 'relative' }}>
        <pre
          style={{
            background: COLOR_BG_SECONDARY,
            borderRadius: RADIUS_COMPONENT,
            padding: SPACING_CONTENT,
            paddingTop: 36,
            fontSize: 11,
            fontFamily: 'monospace',
            overflowX: 'auto',
            whiteSpace: 'pre',
            margin: 0,
            color: COLOR_TEXT,
          }}
        >
          {MCP_CONFIG_SNIPPET}
        </pre>
        <button
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: copied ? '#2B3C35' : COLOR_BG_SECONDARY,
            color: copied ? '#FFFFFF' : COLOR_TEXT_SECONDARY,
            border: '1px solid #D0D0D0',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 10,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Available tools section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING_GAP_HEADER }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            margin: 0,
            color: COLOR_TEXT,
          }}
        >
          Available MCP tools
        </h3>
        <p style={{ fontSize: 13, margin: 0, color: COLOR_TEXT_SECONDARY }}>
          Check the{' '}
          <a href="https://github.com/TJaraC/ai-ready-ds-auditor" style={{ color: COLOR_PRIMARY }}>
            GitHub repo
          </a>{' '}
          to see available MCP tools.
        </p>
      </div>

      </div>

      {/* Export button pinned to bottom — outside scroll area */}
      <div style={{ padding: SPACING_CONTENT, paddingTop: 12 }}>
        <Button
          label="Export variables in JSON"
          onClick={onExportJson}
          disabled={report === null}
        />
      </div>
    </div>
  );
}

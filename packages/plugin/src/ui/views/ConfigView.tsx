import React from 'react';
import type { AuditReport } from '@shared/types';
import { Button } from '../components/Button';
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
}

// ---------------------------------------------------------------------------
// ConfigView
// ---------------------------------------------------------------------------

export function ConfigView({ report, onExportJson }: ConfigViewProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: SPACING_CONTENT,
        gap: SPACING_GAP_BODY,
        boxSizing: 'border-box',
      }}
    >
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
          <a href="#" style={{ color: COLOR_PRIMARY }}>
            GitHub repo
          </a>
        </li>
        <li style={{ fontSize: 13, fontFamily: 'monospace', color: COLOR_TEXT_SECONDARY, lineHeight: 1.5 }}>
          Add to mcp.json (Replace /ABSOLUTE/PATH/TO/ with the full path to your cloned repository.)
        </li>
      </ol>

      {/* Code block */}
      <pre
        style={{
          background: COLOR_BG_SECONDARY,
          borderRadius: RADIUS_COMPONENT,
          padding: SPACING_CONTENT,
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
          <a href="#" style={{ color: COLOR_PRIMARY }}>
            GitHub repo
          </a>{' '}
          for see MCP Tools
        </p>
      </div>

      {/* Export button */}
      <Button
        label="Export variables in JSON"
        onClick={onExportJson}
        disabled={report === null}
      />
    </div>
  );
}

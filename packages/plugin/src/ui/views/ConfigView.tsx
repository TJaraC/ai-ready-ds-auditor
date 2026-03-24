import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// CssOption — single item inside the custom framework dropdown
// ---------------------------------------------------------------------------

function CssOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: 'monospace',
        color: selected || hovered ? '#FFFFFF' : '#1E1E1E',
        background: selected ? '#F55442' : hovered ? '#F55442CC' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.1s ease',
      }}
    >
      {label}
    </div>
  );
}
import type { AuditReport } from '@shared/types';
import type { AuditCategory } from '@shared/messages';
import type { CssFramework, ScopeConfig } from '../state';
import { Button } from '../components/Button';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { StatusBanner } from '../components/StatusBanner';
import { BANNER_COPY } from '../banner-copy';
import {
  COLOR_BG_SECONDARY,
  COLOR_PRIMARY,
  COLOR_SURFACE,
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

function buildMcpConfigSnippet(fileKey: string | null): string {
  const key = fileKey ?? 'YOUR_FIGMA_FILE_KEY';
  return `{
  "mcpServers": [
    {
      "name": "ai-ds-auditor",
      "command": ["node", "/ABSOLUTE/PATH/TO/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "${key}"
      }
    }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfigViewProps {
  report: AuditReport | null;
  onExportJson: () => void;
  cssFramework: CssFramework;
  onCssFrameworkChange: (fw: CssFramework) => void;
  contextStatus: 'injected' | 'outdated' | 'missing' | null;
  scopeConfig: ScopeConfig;
  onToggleCategory: (category: AuditCategory, enabled: boolean) => void;
}

const SCOPE_CATEGORIES: Array<{ key: AuditCategory; label: string }> = [
  { key: 'color', label: 'Colors' },
  { key: 'typography', label: 'Typography' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'border', label: 'Borders' },
  { key: 'effects', label: 'Effects' },
  { key: 'component', label: 'Components' },
  { key: 'icon', label: 'Icons' },
];

// ---------------------------------------------------------------------------
// ConfigView
// ---------------------------------------------------------------------------

export function ConfigView({
  report,
  onExportJson,
  cssFramework,
  onCssFrameworkChange,
  contextStatus,
  scopeConfig,
  onToggleCategory,
}: ConfigViewProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [scopeHovered, setScopeHovered] = useState(false);
  const [fwOpen, setFwOpen] = useState(false);
  const enabledCount = Object.values(scopeConfig).filter(Boolean).length;

  const mcpConfigSnippet = buildMcpConfigSnippet(report?.fileId ?? null);

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(mcpConfigSnippet).then(() => {
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
      {/* Section group title: Audit Config */}
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'monospace',
          margin: 0,
          color: COLOR_TEXT,
        }}
      >
        Audit Config
      </h2>

      {/* Section 1: Audit Scope — title + subtitle + collapsible */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: COLOR_TEXT,
            }}
          >
            Audit Scope
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: COLOR_TEXT_SECONDARY,
            }}
          >
            Choose which categories to include in the audit
          </span>
        </div>
        <div
        style={{
          borderRadius: RADIUS_COMPONENT,
          border: '1px solid #E8E8E8',
        }}
      >
        {/* Header row — div avoids button default styles in Figma's webview */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setScopeOpen((prev) => !prev)}
          onMouseEnter={() => setScopeHovered(true)}
          onMouseLeave={() => setScopeHovered(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setScopeOpen((prev) => !prev); }}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 36,
            padding: '0 12px',
            background: scopeHovered ? COLOR_BG_SECONDARY : COLOR_SURFACE,
            cursor: 'pointer',
            borderRadius: scopeOpen ? `${RADIUS_COMPONENT}px ${RADIUS_COMPONENT}px 0 0` : RADIUS_COMPONENT,
            transition: 'background 0.15s ease',
            userSelect: 'none',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'monospace',
              color: COLOR_TEXT,
            }}
          >
            Active filters
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontFamily: 'monospace',
              color: COLOR_TEXT_SECONDARY,
              marginRight: 8,
            }}
          >
            {`${enabledCount} of ${SCOPE_CATEGORIES.length}`}
          </span>
          <span
            style={{
              fontSize: 9,
              color: COLOR_TEXT_SECONDARY,
              display: 'inline-block',
              transform: scopeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            ▼
          </span>
        </div>

        {/* Collapsible body — max-height animation is reliable across webviews */}
        <div
          style={{
            maxHeight: scopeOpen ? '300px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.22s ease',
          }}
        >
          <div
            style={{
              borderTop: '1px solid #E8E8E8',
              padding: '4px 0',
            }}
          >
            {SCOPE_CATEGORIES.map(({ key, label }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 12px',
                }}
              >
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: COLOR_TEXT }}>
                  {label}
                </span>
                <ToggleSwitch
                  checked={scopeConfig[key]}
                  onChange={(v) => onToggleCategory(key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>{/* end Audit Scope group */}

      {/* Section 2: CSS Framework selector — flat, no card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: COLOR_TEXT,
            }}
          >
            CSS Framework
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: COLOR_TEXT_SECONDARY,
            }}
          >
            Format used for MCP export
          </span>
        </div>

        {/* Custom dropdown */}
        <div style={{ position: 'relative' }}>
          {/* Click-outside backdrop */}
          {fwOpen && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setFwOpen(false)}
            />
          )}

          {/* Trigger button */}
          <button
            onClick={() => setFwOpen((prev) => !prev)}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: 36,
              padding: '0 12px',
              background: COLOR_SURFACE,
              border: `1.5px solid ${fwOpen ? COLOR_PRIMARY : '#E8E8E8'}`,
              borderRadius: RADIUS_COMPONENT,
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 600,
              color: COLOR_TEXT,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            <span>
              {[
                { value: 'tailwind', label: 'Tailwind CSS' },
                { value: 'css-variables', label: 'CSS Variables' },
                { value: 'css-modules', label: 'CSS Modules' },
                { value: 'styled-components', label: 'Styled Components' },
              ].find((o) => o.value === cssFramework)?.label}
            </span>
            <span
              style={{
                fontSize: 9,
                color: COLOR_TEXT_SECONDARY,
                display: 'inline-block',
                transform: fwOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              ▼
            </span>
          </button>

          {/* Dropdown panel */}
          {fwOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: COLOR_SURFACE,
                border: '1.5px solid #E8E8E8',
                borderRadius: RADIUS_COMPONENT,
                overflow: 'hidden',
                zIndex: 100,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              {(
                [
                  { value: 'tailwind' as CssFramework, label: 'Tailwind CSS' },
                  { value: 'css-variables' as CssFramework, label: 'CSS Variables' },
                  { value: 'css-modules' as CssFramework, label: 'CSS Modules' },
                  { value: 'styled-components' as CssFramework, label: 'Styled Components' },
                ] as const
              ).map((opt) => (
                <CssOption
                  key={opt.value}
                  label={opt.label}
                  selected={cssFramework === opt.value}
                  onSelect={() => {
                    onCssFrameworkChange(opt.value);
                    setFwOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
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
          {mcpConfigSnippet}
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

      {/* Export — title + subtitle + ghost button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: COLOR_TEXT,
            }}
          >
            Export
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: COLOR_TEXT_SECONDARY,
            }}
          >
            Save audit variables as a JSON file
          </span>
        </div>
        <button
          onClick={onExportJson}
          disabled={report === null}
          style={{
            width: '100%',
            padding: '10px 16px',
            border: `1.5px solid ${report === null ? '#E8E8E8' : '#D0D0D0'}`,
            borderRadius: RADIUS_COMPONENT,
            background: 'transparent',
            color: report === null ? COLOR_TEXT_SECONDARY : COLOR_TEXT,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'monospace',
            cursor: report === null ? 'not-allowed' : 'pointer',
            opacity: report === null ? 0.5 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          Export variables in JSON
        </button>
      </div>

      </div>
    </div>
  );
}

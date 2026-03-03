import React, { useEffect, useState } from 'react';
import type { AuditReport, AuditIssue } from '@shared/types';
import type { SandboxMessage, UIMessage } from '@shared/messages';

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

type Tab = 'audit' | 'ai-context';
type Phase = 'idle' | 'scanning' | 'injecting' | 'complete' | 'error';
type CssFramework = 'tailwind' | 'css-variables' | 'css-modules' | 'styled-components';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadJson(report: AuditReport): void {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.fileName.replace(/[^a-z0-9]/gi, '-')}-audit.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function healthColor(score: number): string {
  if (score >= 80) return '#1bc47d';
  if (score >= 50) return '#f5a623';
  return 'var(--figma-color-bg-danger)';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components (inline, no separate files)
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
}

function StatCard({ label, value }: StatCardProps): React.ReactElement {
  return (
    <div
      style={{
        background: 'var(--figma-color-bg-secondary)',
        borderRadius: '6px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '56px',
      }}
    >
      <span
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--figma-color-text)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: '10px',
          color: 'var(--figma-color-text-secondary)',
          marginTop: '2px',
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface IssueGroupProps {
  category: string;
  issues: AuditIssue[];
  onSelectNode: (nodeId: string) => void;
}

function IssueGroup({ category, issues, onSelectNode }: IssueGroupProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(true);

  return (
    <div style={{ marginBottom: '4px' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          background: 'var(--figma-color-bg-secondary)',
          border: 'none',
          borderBottom: '1px solid var(--figma-color-border)',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--figma-color-text)',
          textAlign: 'left',
        }}
      >
        <span>
          {capitalize(category)}
          <span
            style={{
              marginLeft: '6px',
              background: 'var(--figma-color-border)',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 400,
              color: 'var(--figma-color-text-secondary)',
            }}
          >
            {issues.length}
          </span>
        </span>
        <span style={{ fontSize: '10px' }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div>
          {issues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => onSelectNode(issue.nodeId)}
              style={{
                width: '100%',
                display: 'block',
                padding: '5px 8px 5px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--figma-color-border)',
                cursor: 'pointer',
                fontSize: '11px',
                color: 'var(--figma-color-text-secondary)',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`${issue.nodeName} — ${issue.offendingValue}`}
            >
              {issue.nodeName} — {issue.offendingValue}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primary action button style
// ---------------------------------------------------------------------------

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  background: 'var(--figma-color-bg-brand)',
  color: 'var(--figma-color-text-onbrand)',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Main App component
// ---------------------------------------------------------------------------

export function App(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('audit');
  const [phase, setPhase] = useState<Phase>('idle');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isOutOfSync, setIsOutOfSync] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cssFramework, setCssFramework] = useState<CssFramework>('tailwind');
  const [scanProgress, setScanProgress] = useState<{ percent: number; currentNode: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // Message listener
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const msg = event.data.pluginMessage as SandboxMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case 'SCAN_PROGRESS':
          setScanProgress({ percent: msg.percent, currentNode: msg.currentNode });
          break;
        case 'SCAN_COMPLETE':
          // Received from INJECT_DATA handler (simpler approach): update report,
          // transition to injecting phase while we wait for INJECT_COMPLETE
          setReport(msg.report);
          setPhase('injecting');
          setScanProgress(null);
          break;
        case 'SCAN_ERROR':
          setPhase('error');
          setErrorMessage(msg.message);
          setScanProgress(null);
          break;
        case 'INJECT_COMPLETE':
          setPhase('complete');
          setIsOutOfSync(false);
          setScanProgress(null);
          break;
        case 'INJECT_ERROR':
          setPhase('error');
          setErrorMessage(msg.message);
          setScanProgress(null);
          break;
        case 'SYNC_OUTDATED':
          setIsOutOfSync(true);
          break;
        default: {
          const _exhaustive: never = msg;
          void _exhaustive;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleAuditAndInject = (): void => {
    setPhase('scanning');
    setScanProgress(null);
    setErrorMessage(null);
    const msg: UIMessage = { type: 'INJECT_DATA' };
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  const handleSelectNode = (nodeId: string): void => {
    const msg: UIMessage = { type: 'SELECT_NODE', nodeId };
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  const handleCopySnippet = (): void => {
    const snippet = JSON.stringify(
      {
        figmaFileKey: 'YOUR_FILE_KEY_FROM_URL',
        fileName: report?.fileName ?? 'your-file',
      },
      null,
      2,
    );
    navigator.clipboard.writeText(snippet).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        // clipboard write failed silently
      },
    );
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const CATEGORY_ORDER: Array<AuditIssue['category']> = ['color', 'typography', 'spacing', 'component'];

  function renderAuditContent(): React.ReactElement {
    switch (phase) {
      case 'idle':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '0 16px',
            }}
          >
            <button onClick={handleAuditAndInject} style={primaryBtnStyle}>
              Audit &amp; Inject
            </button>
          </div>
        );

      case 'scanning':
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: '8px',
              padding: '16px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--figma-color-text)' }}>
              {scanProgress != null ? `Scanning... ${scanProgress.percent}%` : 'Scanning...'}
            </span>
            {scanProgress != null && scanProgress.currentNode && (
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--figma-color-text-secondary)',
                  maxWidth: '280px',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {scanProgress.currentNode}
              </span>
            )}
          </div>
        );

      case 'injecting':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--figma-color-text)' }}>
              Injecting AI context...
            </span>
          </div>
        );

      case 'complete':
        if (!report) {
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--figma-color-text-secondary)' }}>
                No report available.
              </span>
            </div>
          );
        }
        return renderDashboard(report);

      case 'error':
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: '12px',
              padding: '16px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'var(--figma-color-text-danger)',
                textAlign: 'center',
              }}
            >
              {errorMessage ?? 'An unexpected error occurred.'}
            </span>
            <button
              onClick={() => {
                setPhase('idle');
                setErrorMessage(null);
              }}
              style={primaryBtnStyle}
            >
              Try Again
            </button>
          </div>
        );
    }
  }

  function renderDashboard(r: AuditReport): React.ReactElement {
    const issuesByCategory = CATEGORY_ORDER.reduce<Record<string, AuditIssue[]>>((acc, cat) => {
      acc[cat] = r.issues.filter((i) => i.category === cat);
      return acc;
    }, {});

    const score = r.summary.healthScore;
    const scoreBg = healthColor(score);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Success indicator */}
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(27,196,125,0.1)',
            color: '#1bc47d',
            fontWeight: 600,
            fontSize: '12px',
            borderBottom: '1px solid var(--figma-color-border)',
          }}
        >
          ✓ AI Context injected — Ready for Trae/Cursor
        </div>

        {/* Health score banner */}
        <div
          style={{
            padding: '8px 12px',
            background: scoreBg,
            color: score >= 50 ? '#fff' : 'var(--figma-color-text-danger)',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Health Score: {score}%
        </div>

        {/* 2x2 Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '8px',
          }}
        >
          <StatCard label="Tokens" value={r.summary.totalTokens} />
          <StatCard label="Components" value={r.summary.totalComponents} />
          <StatCard label="Issues" value={r.summary.totalIssues} />
          <StatCard label="Health" value={`${score}%`} />
        </div>

        {/* Issue list by category */}
        <div style={{ borderTop: '1px solid var(--figma-color-border)' }}>
          {CATEGORY_ORDER.map((cat) => {
            const catIssues = issuesByCategory[cat] ?? [];
            if (catIssues.length === 0) return null;
            return (
              <IssueGroup
                key={cat}
                category={cat}
                issues={catIssues}
                onSelectNode={handleSelectNode}
              />
            );
          })}
        </div>

        {/* Re-inject button */}
        <div style={{ padding: '8px' }}>
          <button onClick={handleAuditAndInject} style={primaryBtnStyle}>
            Re-inject
          </button>
        </div>
      </div>
    );
  }

  function renderAiContextTab(): React.ReactElement {
    const snippet = JSON.stringify(
      {
        figmaFileKey: 'YOUR_FILE_KEY_FROM_URL',
        fileName: report?.fileName ?? 'your-file',
      },
      null,
      2,
    );

    return (
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* CSS Framework selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--figma-color-text)',
            }}
          >
            CSS Framework
          </label>
          <select
            value={cssFramework}
            onChange={(e) => setCssFramework(e.target.value as CssFramework)}
            style={{
              width: '100%',
              background: 'var(--figma-color-bg-secondary)',
              border: '1px solid var(--figma-color-border)',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'var(--figma-color-text)',
              fontSize: '11px',
            }}
          >
            <option value="tailwind">Tailwind CSS</option>
            <option value="css-variables">CSS Variables</option>
            <option value="css-modules">CSS Modules</option>
            <option value="styled-components">Styled Components</option>
          </select>
        </div>

        {/* Export JSON button */}
        <button
          onClick={() => report && downloadJson(report)}
          disabled={report === null}
          title={report === null ? 'Run Audit & Inject first' : undefined}
          style={{
            ...primaryBtnStyle,
            opacity: report === null ? 0.5 : 1,
            cursor: report === null ? 'not-allowed' : 'pointer',
          }}
        >
          Export JSON
        </button>

        {/* MCP Server Setup section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--figma-color-text)',
            }}
          >
            MCP Server Setup
          </span>

          {/* File name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{ fontSize: '10px', color: 'var(--figma-color-text-secondary)' }}
            >
              File Name
            </span>
            <span style={{ fontSize: '11px', color: 'var(--figma-color-text)' }}>
              {report?.fileName ?? 'Run an audit first'}
            </span>
          </div>

          {/* Instruction */}
          <p
            style={{
              fontSize: '11px',
              color: 'var(--figma-color-text-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Get your File Key from the Figma URL:
            <br />
            <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
              figma.com/design/&#123;FILE_KEY&#125;/...
            </span>
            <br />
            <br />
            Add to mcp.json:
          </p>

          {/* Snippet + Copy button */}
          <div style={{ position: 'relative' }}>
            <pre
              style={{
                margin: 0,
                padding: '8px',
                background: 'var(--figma-color-bg-secondary)',
                border: '1px solid var(--figma-color-border)',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: 'var(--figma-color-text)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {snippet}
            </pre>
            <button
              onClick={handleCopySnippet}
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                padding: '2px 8px',
                fontSize: '10px',
                background: 'var(--figma-color-bg)',
                border: '1px solid var(--figma-color-border)',
                borderRadius: '3px',
                cursor: 'pointer',
                color: 'var(--figma-color-text)',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Root render
  // -------------------------------------------------------------------------

  return (
    <div
      style={{
        height: '480px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '11px',
        background: 'var(--figma-color-bg)',
        color: 'var(--figma-color-text)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          height: '36px',
          borderBottom: '1px solid var(--figma-color-border)',
          flexShrink: 0,
        }}
      >
        {(['audit', 'ai-context'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              width: '50%',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--figma-color-bg-brand)' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--figma-color-text)' : 'var(--figma-color-text-secondary)',
              padding: 0,
            }}
          >
            {t === 'audit' ? 'Audit' : 'AI Context'}
          </button>
        ))}
      </div>

      {/* Out of Sync banner — only on audit tab */}
      {isOutOfSync && tab === 'audit' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--figma-color-bg-danger)',
            color: 'var(--figma-color-text-danger)',
            fontSize: '11px',
            flexShrink: 0,
          }}
        >
          <span>⚠ AI Context may be outdated — Re-inject to update</span>
          <button
            onClick={handleAuditAndInject}
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              background: 'transparent',
              border: '1px solid var(--figma-color-text-danger)',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px',
              color: 'var(--figma-color-text-danger)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Re-inject
          </button>
        </div>
      )}

      {/* Tab content — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {tab === 'audit' ? renderAuditContent() : renderAiContextTab()}
      </div>
    </div>
  );
}

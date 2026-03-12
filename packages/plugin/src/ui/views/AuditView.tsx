import React from 'react';
import type { AuditReport } from '@shared/types';
import type { Phase } from '../state';
import { Button } from '../components/Button';
import { StatusBanner } from '../components/StatusBanner';
import { MetricCard } from '../components/MetricCard';
import { Accordion } from '../components/Accordion';
import { AccordionItem } from '../components/AccordionItem';
import { SPACING_CONTENT, SPACING_GAP_BODY } from '../tokens';

// ---------------------------------------------------------------------------
// Category constants
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = ['color', 'typography', 'spacing', 'border', 'effects', 'component'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  typography: 'Typography',
  spacing: 'Spacing',
  border: 'Border. Radius',
  effects: 'Effects',
  component: 'Components',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AuditViewProps {
  phase: Phase;
  report: AuditReport | null;
  isOutOfSync: boolean;
  errorMessage: string | null;
  scanProgress: { percent: number; currentNode: string } | null;
  onAuditAndInject: () => void;
  onSelectNode: (nodeId: string) => void;
  onResetError: () => void;
}

// ---------------------------------------------------------------------------
// AuditView
// ---------------------------------------------------------------------------

export function AuditView({
  phase,
  report,
  isOutOfSync,
  errorMessage,
  scanProgress,
  onAuditAndInject,
  onSelectNode,
  onResetError,
}: AuditViewProps): React.ReactElement {
  switch (phase) {
    case 'idle':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: SPACING_CONTENT,
            gap: SPACING_GAP_BODY,
            boxSizing: 'border-box',
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: 'var(--figma-color-text)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Welcome to AI-Ready DS Auditor!
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--figma-color-text-secondary)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            Press the button below to get started
          </p>
          <Button label="Audit & Inject" onClick={onAuditAndInject} />
        </div>
      );

    case 'scanning':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: 8,
            padding: SPACING_CONTENT,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--figma-color-text)' }}>
            {scanProgress != null ? `Scanning... ${scanProgress.percent}%` : 'Scanning...'}
          </span>
          {scanProgress != null && scanProgress.currentNode && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--figma-color-text-secondary)',
                maxWidth: 280,
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
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: SPACING_CONTENT,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--figma-color-text)' }}>
            Injecting AI context...
          </span>
        </div>
      );

    case 'complete': {
      if (!report) {
        return (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              padding: SPACING_CONTENT,
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--figma-color-text-secondary)' }}>
              No report available.
            </span>
          </div>
        );
      }

      const bannerVariant = isOutOfSync ? 'warning' : 'success';
      const bannerMessage = isOutOfSync
        ? 'AI Context may be outdated - Re-inject to update'
        : 'AI Context injected - Ready for IDE';

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING_GAP_BODY,
          }}
        >
          {/* Status banner — full width, no side padding */}
          <div style={{ padding: `${SPACING_CONTENT}px ${SPACING_CONTENT}px 0` }}>
            <StatusBanner variant={bannerVariant} message={bannerMessage} />
          </div>

          {/* Metric cards row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: SPACING_GAP_BODY,
              justifyContent: 'center',
              padding: `0 ${SPACING_CONTENT}px`,
            }}
          >
            <MetricCard value={report.summary.totalTokens} label="Variables" />
            <MetricCard value={report.summary.totalComponents} label="Components" />
          </div>

          {/* Summary sentence */}
          <p
            style={{
              fontSize: 13,
              color: 'var(--figma-color-text-secondary)',
              margin: 0,
              padding: `0 ${SPACING_CONTENT}px`,
            }}
          >
            {"We've detected 287 elements without variables applied."}
          </p>

          {/* Accordion list — 570px wide, margin 11px each side */}
          <div style={{ margin: '0 11px' }}>
            {CATEGORY_ORDER.map((cat) => {
              const catIssues = report.issues.filter((i) => i.category === cat);
              if (catIssues.length === 0) return null;
              const label = CATEGORY_LABELS[cat] ?? cat;
              return (
                <Accordion key={cat} label={label} count={catIssues.length}>
                  {catIssues.map((issue) => (
                    <AccordionItem
                      key={issue.id}
                      nodeId={issue.nodeId}
                      nodeName={issue.nodeName}
                      offendingValue={issue.offendingValue}
                      onClick={onSelectNode}
                    />
                  ))}
                </Accordion>
              );
            })}
          </div>

          {/* CTA button */}
          <div style={{ padding: `0 ${SPACING_CONTENT}px ${SPACING_CONTENT}px` }}>
            <Button label="Re-audit & Inject" onClick={onAuditAndInject} />
          </div>
        </div>
      );
    }

    case 'error':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: SPACING_GAP_BODY,
            padding: SPACING_CONTENT,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--figma-color-bg-danger)' }}>
            {errorMessage ?? 'An unexpected error occurred.'}
          </span>
          <Button label="Try Again" onClick={onResetError} />
        </div>
      );
  }
}

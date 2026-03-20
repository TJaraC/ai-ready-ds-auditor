import React from 'react';
import type { AuditReport } from '@shared/types';
import type { Phase } from '../state';
import { Button } from '../components/Button';
import { StatusBanner } from '../components/StatusBanner';
import { MetricCard } from '../components/MetricCard';
import { Accordion } from '../components/Accordion';
import { AccordionItem } from '../components/AccordionItem';
import {
  COLOR_PRIMARY,
  COLOR_TEXT,
  COLOR_TEXT_SECONDARY,
  SPACING_CONTENT,
  SPACING_GAP_BODY,
} from '../tokens';
import { BANNER_COPY } from '../banner-copy';

// ---------------------------------------------------------------------------
// Category constants
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = ['color', 'typography', 'spacing', 'border', 'effects', 'component'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  color: 'Color',
  typography: 'Typography',
  spacing: 'Spacing',
  border: 'Border',
  effects: 'Effects',
  component: 'Components',
};

const CATEGORY_COLORS: Record<string, string> = {
  color: '#F55442',
  typography: '#7B61FF',
  spacing: '#1E9B6B',
  border: '#F9A825',
  effects: '#FF9500',
  component: '#2B9FE0',
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
  contextStatus: 'injected' | 'outdated' | 'missing' | null;
  unpublishedCount: number;
  hasVisitedConfig: boolean;
  onGoToConfig: () => void;
  allCategoriesDisabled: boolean;
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
  contextStatus,
  unpublishedCount,
  hasVisitedConfig,
  onGoToConfig,
  allCategoriesDisabled,
}: AuditViewProps): React.ReactElement {
  switch (phase) {
    case 'idle': {
      // First-use state: no injected data + hasn't visited config this session
      const isFirstUse = contextStatus === 'missing' && !hasVisitedConfig;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: SPACING_CONTENT,
            boxSizing: 'border-box',
          }}
        >
          {/* Message centered in available space */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: COLOR_TEXT,
                textAlign: 'center',
                margin: 0,
              }}
            >
              {isFirstUse ? 'AI-Ready DS Auditor' : 'Welcome to AI-Ready DS Auditor!'}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: COLOR_TEXT_SECONDARY,
                textAlign: 'center',
                margin: 0,
              }}
            >
              {isFirstUse
                ? 'Set up your audit scope before running your first scan.'
                : 'Press the button below to get started'}
            </p>
          </div>
          {/* Button pinned to bottom */}
          {isFirstUse ? (
            <Button label="Go to Config \u2192" onClick={onGoToConfig} />
          ) : (
            <div title={allCategoriesDisabled ? 'Enable at least one category' : undefined}>
              <Button
                label="Audit & Inject"
                onClick={onAuditAndInject}
                disabled={allCategoriesDisabled}
              />
            </div>
          )}
        </div>
      );
    }

    case 'scanning':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            padding: SPACING_CONTENT,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 13, color: COLOR_TEXT, fontFamily: 'monospace' }}>
            Scanning design system...
          </span>
          {/* Determinate progress bar */}
          <div
            style={{
              width: '100%',
              maxWidth: 240,
              height: 4,
              borderRadius: 2,
              background: '#E8E8E8',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                background: COLOR_PRIMARY,
                width: `${scanProgress?.percent ?? 0}%`,
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: COLOR_TEXT_SECONDARY, fontFamily: 'monospace' }}>
            {`${scanProgress?.percent ?? 0}% complete`}
          </span>
        </div>
      );

    case 'injecting':
      return (
        <div
          style={{
            display: 'flex',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: SPACING_CONTENT,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 13, color: COLOR_TEXT }}>
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
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: SPACING_CONTENT,
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY }}>
              No report available.
            </span>
          </div>
        );
      }

      // Derive banner from contextStatus (UIX-03) — centralized in banner-copy.ts
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
          {/* Status banner — only shown when contextStatus is set */}
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
            {/* Metric cards row */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
              <MetricCard value={report.summary.totalTokens} label="Variables" />
              <MetricCard
                value={report.summary.totalComponents}
                label="Components"
                {...(unpublishedCount > 0 ? { badge: `${unpublishedCount} unpublished` } : {})}
              />
            </div>

            {/* Summary sentence — real count */}
            <p style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, margin: 0 }}>
              {`We've detected ${report.issues.length} elements without variables applied.`}
            </p>

            {/* Accordion list */}
            <div>
              {CATEGORY_ORDER.map((cat) => {
                const catIssues = report.issues.filter((i) => i.category === cat);
                if (catIssues.length === 0) return null;
                const label = CATEGORY_LABELS[cat] ?? cat;
                const accent = CATEGORY_COLORS[cat];
                return (
                  <Accordion key={cat} label={label} count={catIssues.length} accent={accent}>
                    {catIssues.map((issue) => (
                      <AccordionItem
                        key={issue.id}
                        nodeId={issue.nodeId}
                        nodeName={issue.nodeName}
                        offendingValue={issue.offendingValue}
                        issueType={issue.issueType}
                        onClick={onSelectNode}
                      />
                    ))}
                  </Accordion>
                );
              })}
            </div>
          </div>

          {/* Button always pinned to bottom */}
          <div style={{ padding: SPACING_CONTENT, paddingTop: 12 }}>
            <div title={allCategoriesDisabled ? 'Enable at least one category' : undefined}>
              <Button
                label="Re-audit & Inject"
                onClick={onAuditAndInject}
                disabled={allCategoriesDisabled}
              />
            </div>
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
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: SPACING_GAP_BODY,
            padding: SPACING_CONTENT,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: 13, color: COLOR_PRIMARY }}>
            {errorMessage ?? 'An unexpected error occurred.'}
          </span>
          <Button label="Try Again" onClick={onResetError} />
        </div>
      );
  }
}

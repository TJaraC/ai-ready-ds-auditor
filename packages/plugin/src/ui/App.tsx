import React, { useReducer, useState } from 'react';
import type { UIMessage, AuditCategory } from '@shared/messages';
import type { AuditReport } from '@shared/types';
import { appReducer, initialState } from './state';
import type { AppState, CssFramework } from './state';
import { useAppMessages } from './useAppMessages';
import { Tabs } from './components/Tabs';
import { AuditView } from './views/AuditView';
import { ConfigView } from './views/ConfigView';
import { COLOR_SURFACE, RADIUS_FRAME } from './tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCssVarName(tokenName: string): string {
  return `--${tokenName.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase()}`;
}

function downloadJson(report: AuditReport, cssFramework: CssFramework, contextStatus: AppState['contextStatus']): void {
  const processedTokens = report.tokens.map(({ rawValue: _raw, ...token }) => ({
    ...token,
    cssVar: toCssVarName(token.name),
  }));

  const tokenCountsByType: Record<string, number> = {};
  for (const token of processedTokens) {
    tokenCountsByType[token.type] = (tokenCountsByType[token.type] ?? 0) + 1;
  }

  const payload = {
    version: report.schemaVersion,
    fileKey: report.fileId,
    fileName: report.fileName,
    exportedAt: new Date().toISOString(),
    tokenCounts: {
      total: processedTokens.length,
      byType: tokenCountsByType,
    },
    componentCount: report.summary.totalComponents,
    cssFramework,
    auditStatus: 'complete',
    contextStatus,
    tokens: processedTokens,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.fileName.replace(/[^a-z0-9]/gi, '-')}-tokens.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App(): React.ReactElement {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [hasVisitedConfig, setHasVisitedConfig] = useState(false);
  useAppMessages(dispatch);

  const allCategoriesDisabled = Object.values(state.scopeConfig).every((v) => !v);

  const enabledCategories = (Object.entries(state.scopeConfig) as Array<[AuditCategory, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([cat]) => cat);

  const handleAuditAndInject = (): void => {
    if (state.phase === 'scanning' || state.phase === 'injecting') return;
    if (allCategoriesDisabled) return;
    dispatch({ type: 'START_AUDIT' });
    const msg: UIMessage = { type: 'INJECT_DATA', enabledCategories };
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  const handleSelectNode = (nodeId: string): void => {
    const msg: UIMessage = { type: 'SELECT_NODE', nodeId };
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  const handleGoToConfig = (): void => {
    setHasVisitedConfig(true);
    dispatch({ type: 'SET_TAB', tab: 'config' });
  };

  const handleToggleCategory = (category: AuditCategory, enabled: boolean): void => {
    dispatch({ type: 'TOGGLE_SCOPE_CATEGORY', category, enabled });
    const msg: UIMessage = { type: 'TOGGLE_SCOPE', category, enabled };
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  const handleExportJson = (): void => {
    if (!state.report) return;
    downloadJson(state.report, state.cssFramework, state.contextStatus);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        background: COLOR_SURFACE,
        borderRadius: `0 0 ${RADIUS_FRAME}px ${RADIUS_FRAME}px`,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Tabs
        activeTab={state.tab}
        onTabChange={(tab) => dispatch({ type: 'SET_TAB', tab })}
      />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {state.tab === 'audit' ? (
          <AuditView
            phase={state.phase}
            report={state.report}
            isOutOfSync={state.isOutOfSync}
            errorMessage={state.errorMessage}
            scanProgress={state.scanProgress}
            onAuditAndInject={handleAuditAndInject}
            onSelectNode={handleSelectNode}
            onResetError={() => dispatch({ type: 'RESET_ERROR' })}
            contextStatus={state.contextStatus}
            unpublishedCount={state.unpublishedCount}
            hasVisitedConfig={hasVisitedConfig}
            onGoToConfig={handleGoToConfig}
            allCategoriesDisabled={allCategoriesDisabled}
          />
        ) : (
          <ConfigView
            report={state.report}
            onExportJson={handleExportJson}
            cssFramework={state.cssFramework}
            onCssFrameworkChange={(fw: CssFramework) => dispatch({ type: 'SET_CSS_FRAMEWORK', cssFramework: fw })}
            contextStatus={state.contextStatus}
            scopeConfig={state.scopeConfig}
            onToggleCategory={handleToggleCategory}
          />
        )}
      </div>
    </div>
  );
}

import React, { useReducer } from 'react';
import type { UIMessage } from '@shared/messages';
import type { AuditReport } from '@shared/types';
import { appReducer, initialState } from './state';
import { useAppMessages } from './useAppMessages';
import { Tabs } from './components/Tabs';
import { AuditView } from './views/AuditView';
import { ConfigView } from './views/ConfigView';
import { COLOR_SURFACE, RADIUS_FRAME } from './tokens';

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

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App(): React.ReactElement {
  const [state, dispatch] = useReducer(appReducer, initialState);
  useAppMessages(dispatch);

  const handleAuditAndInject = (): void => {
    dispatch({ type: 'START_AUDIT' });
    const msg: UIMessage = { type: 'INJECT_DATA' };
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  const handleSelectNode = (nodeId: string): void => {
    const msg: UIMessage = { type: 'SELECT_NODE', nodeId };
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  const handleExportJson = (): void => {
    if (!state.report) return;
    downloadJson(state.report);
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
          />
        ) : (
          <ConfigView
            report={state.report}
            onExportJson={handleExportJson}
          />
        )}
      </div>
    </div>
  );
}

import type { SandboxMessage, UIMessage } from '@shared/messages';
import { runAudit } from './audit/index';
import { injectReport } from './inject';

// Show the plugin UI
figma.showUI(__html__, { width: 320, height: 480, themeColors: true });

// Handle messages from the UI iframe
figma.ui.onmessage = (raw: unknown): void => {
  // Cast to UIMessage — type guard added in Phase 2
  const msg = raw as UIMessage;

  switch (msg.type) {
    case 'START_SCAN': {
      runAudit()
        .then((report) => {
          const msg: SandboxMessage = { type: 'SCAN_COMPLETE', report };
          figma.ui.postMessage(msg);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error during scan';
          const msg: SandboxMessage = { type: 'SCAN_ERROR', message };
          figma.ui.postMessage(msg);
        });
      break;
    }
    case 'INJECT_DATA': {
      runAudit()
        .then((report) => {
          // Send SCAN_COMPLETE first — UI needs the report to render the dashboard
          const scanMsg: SandboxMessage = { type: 'SCAN_COMPLETE', report };
          figma.ui.postMessage(scanMsg);

          const result = injectReport(report);
          const doneMsg: SandboxMessage = {
            type: 'INJECT_COMPLETE',
            bytesWritten: result.bytesWritten,
            chunkCount: result.chunkCount,
          };
          figma.ui.postMessage(doneMsg);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Injection failed — unknown error';
          const errMsg: SandboxMessage = { type: 'INJECT_ERROR', message };
          figma.ui.postMessage(errMsg);
        });
      break;
    }
    case 'SELECT_NODE': {
      // Navigate canvas to selected node
      const node = figma.getNodeById(msg.nodeId);
      if (node && 'type' in node) {
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      break;
    }
    default: {
      // Exhaustiveness check — TypeScript will error if a new UIMessage type is added
      // but not handled here
      const _exhaustive: never = msg;
      void _exhaustive;
      break;
    }
  }
};

// Detect document changes and notify UI that injected data is stale (2-second debounce)
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

figma.on('documentchange', (event) => {
  // NOTE: Figma documentchange does NOT fire for variable changes (known API limitation).
  // Only the 6 documented change types are available. Variable changes will not trigger this.
  const relevant = event.documentChanges.some(
    (change) =>
      change.type === 'CREATE' ||
      change.type === 'DELETE' ||
      change.type === 'PROPERTY_CHANGE' ||
      change.type === 'STYLE_CREATE' ||
      change.type === 'STYLE_DELETE' ||
      change.type === 'STYLE_PROPERTY_CHANGE'
  );

  if (!relevant) return;

  if (syncDebounceTimer !== null) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    const outdatedMsg: SandboxMessage = {
      type: 'SYNC_OUTDATED',
      lastScannedAt: new Date().toISOString(),
    };
    figma.ui.postMessage(outdatedMsg);
    syncDebounceTimer = null;
  }, 2000);
});

// Send initial message to UI to confirm sandbox is alive
const initMsg: SandboxMessage = {
  type: 'SYNC_OUTDATED',
  lastScannedAt: new Date().toISOString(),
};
figma.ui.postMessage(initMsg);

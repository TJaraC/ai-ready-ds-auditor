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
      isInjecting = true;
      runAudit()
        .then((report) => {
          // Send SCAN_COMPLETE first — UI needs the report to render the dashboard
          const scanMsg: SandboxMessage = { type: 'SCAN_COMPLETE', report };
          figma.ui.postMessage(scanMsg);

          const result = injectReport(report);

          // Clear any pending SYNC_OUTDATED triggered by setPluginData writes,
          // then lower the flag so real document changes are tracked again.
          if (syncDebounceTimer !== null) {
            clearTimeout(syncDebounceTimer);
            syncDebounceTimer = null;
          }
          isInjecting = false;

          const doneMsg: SandboxMessage = {
            type: 'INJECT_COMPLETE',
            bytesWritten: result.bytesWritten,
            chunkCount: result.chunkCount,
          };
          figma.ui.postMessage(doneMsg);
        })
        .catch((err: unknown) => {
          isInjecting = false;
          const message = err instanceof Error ? err.message : 'Injection failed — unknown error';
          const errMsg: SandboxMessage = { type: 'INJECT_ERROR', message };
          figma.ui.postMessage(errMsg);
        });
      break;
    }
    case 'SELECT_NODE': {
      // Navigate canvas to selected node (dynamic-page requires async variant)
      figma.getNodeByIdAsync(msg.nodeId).then((node) => {
        if (node && 'type' in node) {
          figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        }
      });
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

// Detect document changes and notify UI that injected data is stale (2-second debounce).
// Figma requires loadAllPagesAsync() before registering a documentchange handler.
// isInjecting suppresses the handler while setPluginData() writes are in flight
// (each write triggers PROPERTY_CHANGE which would falsely mark data as stale).
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isInjecting = false;

figma.loadAllPagesAsync().then(() => {
  figma.on('documentchange', (event) => {
    // Suppress during injection — setPluginData writes trigger PROPERTY_CHANGE
    // which would falsely mark just-injected data as stale.
    if (isInjecting) return;

    // NOTE: Figma documentchange does NOT fire for variable changes (known API limitation).
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
});

// Send initial message to UI to confirm sandbox is alive
const initMsg: SandboxMessage = {
  type: 'SYNC_OUTDATED',
  lastScannedAt: new Date().toISOString(),
};
figma.ui.postMessage(initMsg);

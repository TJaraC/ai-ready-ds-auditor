import type { SandboxMessage, UIMessage } from '@shared/messages';
import { runAudit } from './audit/index';
import { injectReport } from './inject';
import { injectSvgs } from './inject-svgs';

// Show the plugin UI
figma.showUI(__html__, { width: 380, height: 600, themeColors: true });

// Handle messages from the UI iframe
figma.ui.onmessage = (raw: unknown): void => {
  // Cast to UIMessage — type guard added in Phase 2
  const msg = raw as UIMessage;

  switch (msg.type) {
    case 'START_SCAN': {
      runAudit({ skipSvg: true })
        .then(({ report }) => {
          // SVGs skipped for scan-only (not injected until INJECT_DATA)
          const msg: SandboxMessage = { type: 'SCAN_COMPLETE', report };
          figma.ui.postMessage(msg);
        })
        .catch((err: unknown) => {
          console.error('Scan error:', err);
          const message = 'Audit failed — Try running Audit & Inject again.';
          const msg: SandboxMessage = { type: 'SCAN_ERROR', message };
          figma.ui.postMessage(msg);
        });
      break;
    }
    case 'INJECT_DATA': {
      runAudit()
        .then(({ report, svgRecords }) => {
          // Send SCAN_COMPLETE first — UI needs the report to render the dashboard
          const scanMsg: SandboxMessage = { type: 'SCAN_COMPLETE', report };
          figma.ui.postMessage(scanMsg);

          const result = injectReport(report);
          injectSvgs(svgRecords);

          // Record injection time and cancel any pending debounce timer.
          // documentchange PROPERTY_CHANGE events from setPluginData fire async,
          // so we use a grace period rather than a flag.
          lastInjectedAt = Date.now();
          if (syncDebounceTimer !== null) {
            clearTimeout(syncDebounceTimer);
            syncDebounceTimer = null;
          }

          const doneMsg: SandboxMessage = {
            type: 'INJECT_COMPLETE',
            bytesWritten: result.bytesWritten,
            chunkCount: result.chunkCount,
          };
          figma.ui.postMessage(doneMsg);
        })
        .catch((err: unknown) => {
          console.error('Injection error:', err);
          const message = 'Injection failed — Try running Audit & Inject again.';
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
    case 'TOGGLE_SCOPE': {
      // Scope toggle received from UI — will be wired to persistence in Plan 02
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
// lastInjectedAt tracks when injection finished; documentchange events fired within
// POST_INJECTION_GRACE_MS of that time are ignored (setPluginData writes trigger
// PROPERTY_CHANGE asynchronously, which would falsely mark fresh data as stale).
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastInjectedAt = 0;
const POST_INJECTION_GRACE_MS = 5000;

figma.loadAllPagesAsync().then(() => {
  figma.on('documentchange', (event) => {
    // Suppress events within the grace period after injection — setPluginData writes
    // trigger PROPERTY_CHANGE asynchronously, which would falsely mark fresh data as stale.
    if (Date.now() - lastInjectedAt < POST_INJECTION_GRACE_MS) return;

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

// On startup: check whether AI Context has ever been injected.
// If no plugin data keys exist, signal the UI that context is missing.
// SYNC_OUTDATED is NOT sent on startup — it is reserved for document change events.
const startupKeys = figma.root.getPluginDataKeys();
if (startupKeys.length === 0) {
  const missingMsg: SandboxMessage = { type: 'CONTEXT_STATUS_CHECK', status: 'missing' };
  figma.ui.postMessage(missingMsg);
}
// If keys exist, contextStatus stays null (injected/outdated will be set later via
// INJECT_COMPLETE or SYNC_OUTDATED — no pre-flight read of plugin data needed here).

// Send current file key to UI on startup.
// figma.fileKey is string | undefined — guard before sending.
const fk = figma.fileKey;
const fileKeyMsg: SandboxMessage = { type: 'FILE_KEY', fileKey: fk ?? null };
figma.ui.postMessage(fileKeyMsg);

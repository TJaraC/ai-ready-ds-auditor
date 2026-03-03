import type { SandboxMessage, UIMessage } from '@shared/messages';
import { runAudit } from './audit/index';

// Show the plugin UI
figma.showUI(__html__, { width: 320, height: 480 });

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
      // Phase 3: trigger data injection
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

// Send initial message to UI to confirm sandbox is alive
const initMsg: SandboxMessage = {
  type: 'SYNC_OUTDATED',
  lastScannedAt: new Date().toISOString(),
};
figma.ui.postMessage(initMsg);

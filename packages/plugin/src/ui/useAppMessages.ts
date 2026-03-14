import { useEffect } from 'react';
import type { SandboxMessage } from '@shared/messages';
import type { AppAction } from './state';

/**
 * useAppMessages — subscribes to window message events from the Figma sandbox.
 *
 * Converts each SandboxMessage into an AppAction and dispatches it.
 * This hook is the ONLY place that reads from window.addEventListener('message').
 */
export function useAppMessages(dispatch: (action: AppAction) => void): void {
  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const msg = event.data.pluginMessage as SandboxMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case 'SCAN_PROGRESS':
          dispatch({ type: 'SCAN_PROGRESS', percent: msg.percent, currentNode: msg.currentNode });
          break;
        case 'SCAN_COMPLETE':
          dispatch({ type: 'SCAN_COMPLETE', report: msg.report });
          break;
        case 'SCAN_ERROR':
          dispatch({ type: 'SCAN_ERROR', message: msg.message });
          break;
        case 'INJECT_COMPLETE':
          dispatch({ type: 'INJECT_COMPLETE' });
          break;
        case 'INJECT_ERROR':
          dispatch({ type: 'INJECT_ERROR', message: msg.message });
          break;
        case 'SYNC_OUTDATED':
          dispatch({ type: 'SYNC_OUTDATED' });
          break;
        case 'CONTEXT_STATUS_CHECK':
          dispatch({ type: 'SET_CONTEXT_STATUS', status: msg.status });
          break;
        default: {
          const _exhaustive: never = msg;
          void _exhaustive;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [dispatch]);
}

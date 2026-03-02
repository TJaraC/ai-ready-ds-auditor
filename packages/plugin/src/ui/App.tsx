import React, { useEffect, useState } from 'react';
import type { SandboxMessage } from '@shared/messages';

export function App(): React.ReactElement {
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    // Listen for messages from the sandbox
    const handleMessage = (event: MessageEvent): void => {
      const msg = event.data.pluginMessage as SandboxMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case 'SYNC_OUTDATED':
          setStatus(`Ready (last scanned: ${msg.lastScannedAt})`);
          break;
        case 'SCAN_PROGRESS':
          setStatus(`Scanning... ${msg.percent}% — ${msg.currentNode}`);
          break;
        case 'SCAN_COMPLETE':
          setStatus('Scan complete');
          break;
        case 'SCAN_ERROR':
          setStatus(`Error: ${msg.message}`);
          break;
        case 'INJECT_COMPLETE':
          setStatus(`Injected ${msg.bytesWritten} bytes in ${msg.chunkCount} chunks`);
          break;
        case 'INJECT_ERROR':
          setStatus(`Inject error: ${msg.message}`);
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

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ marginBottom: '8px' }}>AI-Ready DS Auditor</h2>
      <p style={{ color: '#666' }}>{status}</p>
    </div>
  );
}

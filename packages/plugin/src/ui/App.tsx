import React, { useEffect, useState } from 'react';
import type { SandboxMessage, UIMessage } from '@shared/messages';

export function App(): React.ReactElement {
  const [status, setStatus] = useState<string>('Initializing...');
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (entry: string): void => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} -- ${entry}`]);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const msg = event.data.pluginMessage as SandboxMessage | undefined;
      if (!msg) return;

      switch (msg.type) {
        case 'SYNC_OUTDATED':
          setStatus(`Sandbox ready`);
          appendLog(`SYNC_OUTDATED received (lastScannedAt: ${msg.lastScannedAt})`);
          break;
        case 'SCAN_PROGRESS':
          appendLog(`SCAN_PROGRESS: ${msg.percent}% -- node: "${msg.currentNode}"`);
          break;
        case 'SCAN_COMPLETE':
          appendLog('SCAN_COMPLETE received');
          break;
        case 'SCAN_ERROR':
          appendLog(`SCAN_ERROR: ${msg.message}`);
          break;
        case 'INJECT_COMPLETE':
          appendLog(`INJECT_COMPLETE: ${msg.bytesWritten}B in ${msg.chunkCount} chunks`);
          break;
        case 'INJECT_ERROR':
          appendLog(`INJECT_ERROR: ${msg.message}`);
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

  const pingRoundTrip = (): void => {
    const msg: UIMessage = { type: 'START_SCAN' };
    parent.postMessage({ pluginMessage: msg }, '*');
    appendLog('START_SCAN sent to sandbox -- waiting for SCAN_PROGRESS...');
  };

  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', fontSize: '13px' }}>
      <h2 style={{ marginBottom: '12px', fontSize: '15px' }}>AI-Ready DS Auditor</h2>
      <p style={{ marginBottom: '12px', color: '#555' }}>Status: {status}</p>
      <button
        onClick={pingRoundTrip}
        style={{
          padding: '8px 16px',
          background: '#18A0FB',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '12px',
        }}
      >
        Ping round-trip
      </button>
      <div
        style={{
          background: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '11px',
        }}
      >
        {log.length === 0 ? (
          <span style={{ color: '#aaa' }}>Message log will appear here...</span>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

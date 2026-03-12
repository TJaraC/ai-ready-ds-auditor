import React from 'react';
import {
  COLOR_BG_SECONDARY,
  COLOR_SURFACE,
  COLOR_TEXT,
  COLOR_TEXT_SECONDARY,
  RADIUS_COMPONENT,
  SPACING_CONTENT,
} from '../tokens';

interface AccordionProps {
  label: string;
  count: number;
  accent?: string | undefined;
  children: React.ReactNode;
}

export function Accordion({ label, count, accent, children }: AccordionProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      style={{
        width: '100%',
        borderRadius: RADIUS_COMPONENT,
        background: COLOR_SURFACE,
        border: '1px solid #E8E8E8',
        borderLeft: accent ? `3px solid ${accent}` : '1px solid #E8E8E8',
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 44,
          padding: `0 ${SPACING_CONTENT}px`,
          background: COLOR_SURFACE,
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: COLOR_TEXT,
            }}
          >
            {label}
          </span>
          <span
            style={{
              background: COLOR_BG_SECONDARY,
              borderRadius: 10,
              padding: '2px 8px',
              fontSize: 11,
              color: COLOR_TEXT_SECONDARY,
            }}
          >
            {count}
          </span>
        </span>
        <span style={{ fontSize: 11, color: COLOR_TEXT_SECONDARY }}>
          {open ? '▼' : '▶'}
        </span>
      </button>
      {open && (
        <div style={{ padding: `0 0 8px` }}>
          {children}
        </div>
      )}
    </div>
  );
}

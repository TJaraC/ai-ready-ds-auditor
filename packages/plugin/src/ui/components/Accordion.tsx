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
  children: React.ReactNode;
}

export function Accordion({ label, count, children }: AccordionProps): React.ReactElement {
  const [open, setOpen] = React.useState(true);

  return (
    <div
      style={{
        width: '100%',
        borderRadius: RADIUS_COMPONENT,
        background: COLOR_SURFACE,
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
          height: 48,
          padding: `0 ${SPACING_CONTENT}px`,
          background: COLOR_SURFACE,
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
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
              marginLeft: 8,
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
        <div
          style={{
            padding: `0 ${SPACING_CONTENT}px ${SPACING_CONTENT}px`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

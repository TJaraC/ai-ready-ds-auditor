import React from 'react';
import {
  COLOR_SURFACE,
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
        width: 570,
        borderRadius: RADIUS_COMPONENT,
        background: COLOR_SURFACE,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 88,
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
              color: 'var(--figma-color-text)',
            }}
          >
            {label}
          </span>
          <span
            style={{
              marginLeft: 8,
              background: 'var(--figma-color-bg-secondary)',
              borderRadius: 10,
              padding: '2px 8px',
              fontSize: 11,
              color: 'var(--figma-color-text-secondary)',
            }}
          >
            {count}
          </span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--figma-color-text-secondary)' }}>
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

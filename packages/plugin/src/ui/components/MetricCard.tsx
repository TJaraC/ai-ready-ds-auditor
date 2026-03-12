import React from 'react';
import {
  COLOR_SURFACE,
  RADIUS_COMPONENT,
  SPACING_CONTENT,
} from '../tokens';

interface MetricCardProps {
  value: number | string;
  label: string;
}

export function MetricCard({ value, label }: MetricCardProps): React.ReactElement {
  return (
    <div
      style={{
        width: 347,
        minHeight: 202,
        borderRadius: RADIUS_COMPONENT,
        padding: SPACING_CONTENT,
        background: COLOR_SURFACE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 40,
          fontWeight: 700,
          fontFamily: 'monospace',
          color: 'var(--figma-color-text)',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 13,
          fontFamily: 'monospace',
          color: 'var(--figma-color-text-secondary)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

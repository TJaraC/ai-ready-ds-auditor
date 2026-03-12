import React from 'react';
import {
  COLOR_SURFACE,
  COLOR_TEXT,
  COLOR_TEXT_SECONDARY,
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
        flex: 1,
        minHeight: 100,
        borderRadius: RADIUS_COMPONENT,
        padding: SPACING_CONTENT,
        background: COLOR_SURFACE,
        border: '1px solid #E8E8E8',
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
          color: COLOR_TEXT,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 13,
          fontFamily: 'monospace',
          color: COLOR_TEXT_SECONDARY,
        }}
      >
        {label}
      </span>
    </div>
  );
}

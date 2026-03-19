import React from 'react';
import {
  COLOR_PRIMARY,
  COLOR_PRIMARY_HOVER,
  COLOR_SURFACE,
  RADIUS_COMPONENT,
  SPACING_CONTENT,
} from '../tokens';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps): React.ReactElement {
  const [hovered, setHovered] = React.useState(false);

  const background = disabled
    ? 'var(--figma-color-bg-disabled)'
    : hovered
      ? COLOR_PRIMARY_HOVER
      : COLOR_PRIMARY;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: 74,
        border: 'none',
        borderRadius: RADIUS_COMPONENT,
        background,
        color: COLOR_SURFACE,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'monospace',
        padding: SPACING_CONTENT,
        transition: 'background 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

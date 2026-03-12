import React from 'react';
import {
  COLOR_STATUS_SUCCESS,
  COLOR_STATUS_ERROR,
  COLOR_SURFACE,
  SPACING_CONTENT,
} from '../tokens';

interface StatusBannerProps {
  variant: 'success' | 'warning' | 'error';
  message: string;
}

const VARIANT_BG: Record<StatusBannerProps['variant'], string> = {
  success: COLOR_STATUS_SUCCESS,
  warning: COLOR_STATUS_ERROR,
  error: COLOR_STATUS_ERROR,
};

const VARIANT_ICON: Record<StatusBannerProps['variant'], string> = {
  success: '✓ ',
  warning: '⚠ ',
  error: '✕ ',
};

export function StatusBanner({ variant, message }: StatusBannerProps): React.ReactElement {
  return (
    <div
      style={{
        width: '100%',
        padding: `${SPACING_CONTENT}px`,
        background: VARIANT_BG[variant],
        color: COLOR_SURFACE,
        fontSize: 13,
        fontFamily: 'monospace',
        fontWeight: 600,
      }}
    >
      {VARIANT_ICON[variant]}{message}
    </div>
  );
}

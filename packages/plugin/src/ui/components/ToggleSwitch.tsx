import React from 'react';
import { COLOR_PRIMARY, COLOR_BG_SECONDARY } from '../tokens';

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 20;
const KNOB_SIZE = 16;
const KNOB_OFFSET = 2;

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps): React.ReactElement {
  return (
    <div
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        background: checked ? COLOR_PRIMARY : COLOR_BG_SECONDARY,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: '#FFFFFF',
          position: 'absolute',
          top: KNOB_OFFSET,
          left: checked ? TRACK_WIDTH - KNOB_SIZE - KNOB_OFFSET : KNOB_OFFSET,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

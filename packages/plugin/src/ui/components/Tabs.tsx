import React from 'react';
import type { Tab } from '../state';
import {
  COLOR_SURFACE,
  RADIUS_TABS,
  SPACING_GAP_HEADER,
} from '../tokens';

interface TabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps): React.ReactElement {
  const tabs: Tab[] = ['audit', 'config'];
  const labels: Record<Tab, string> = {
    audit: 'Audit',
    config: 'Config',
  };

  return (
    <div
      style={{
        width: 592,
        height: 74,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING_GAP_HEADER,
        padding: SPACING_GAP_HEADER,
      }}
    >
      <div style={{ display: 'flex', width: '100%' }}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                width: '50%',
                height: 50,
                borderRadius: RADIUS_TABS,
                background: isActive ? COLOR_SURFACE : 'transparent',
                fontWeight: isActive ? 700 : 400,
                color: isActive ? 'var(--figma-color-text)' : 'var(--figma-color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'monospace',
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

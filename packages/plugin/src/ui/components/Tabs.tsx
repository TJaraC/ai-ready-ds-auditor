import React from 'react';
import type { Tab } from '../state';
import {
  COLOR_PRIMARY,
  COLOR_TEXT,
  COLOR_TEXT_SECONDARY,
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
        width: '100%',
        display: 'flex',
        padding: `${SPACING_GAP_HEADER}px ${SPACING_GAP_HEADER}px 0`,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              flex: 1,
              height: 44,
              background: 'transparent',
              border: 'none',
              borderBottom: isActive
                ? `2px solid ${COLOR_PRIMARY}`
                : '2px solid transparent',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? COLOR_TEXT : COLOR_TEXT_SECONDARY,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'monospace',
              paddingBottom: 2,
            }}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}

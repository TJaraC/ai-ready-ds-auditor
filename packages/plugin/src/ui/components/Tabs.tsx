import React from 'react';
import type { Tab } from '../state';
import {
  COLOR_PRIMARY,
  COLOR_TEXT,
  COLOR_TEXT_SECONDARY,
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
  const [hoveredTab, setHoveredTab] = React.useState<Tab | null>(null);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        padding: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        const isHovered = hoveredTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            onMouseEnter={() => setHoveredTab(tab)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              flex: 1,
              height: 44,
              background: 'transparent',
              border: 'none',
              borderBottom: isActive
                ? `2px solid ${COLOR_PRIMARY}`
                : '2px solid transparent',
              fontWeight: isActive ? 700 : 400,
              color: isActive || isHovered ? COLOR_TEXT : COLOR_TEXT_SECONDARY,
              cursor: isActive ? 'default' : 'pointer',
              fontSize: 13,
              fontFamily: 'monospace',
              paddingBottom: 2,
              transition: 'color 0.15s ease',
            }}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}

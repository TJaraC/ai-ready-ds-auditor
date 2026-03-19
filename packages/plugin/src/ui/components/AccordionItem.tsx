import React from 'react';
import { COLOR_BG_SECONDARY, COLOR_TEXT_SECONDARY, SPACING_CONTENT } from '../tokens';

// Short human-readable labels for each issueType, shown as a dim badge on the right.
const TYPE_LABELS: Record<string, string> = {
  'hardcoded-fill': 'fill',
  'hardcoded-stroke': 'stroke',
  'hardcoded-cornerRadius': 'radius',
  'hardcoded-strokeWeight': 'width',
  'hardcoded-shadow': 'shadow',
  'hardcoded-blur': 'blur',
  'hardcoded-fontSize': 'font-size',
  'hardcoded-fontWeight': 'font-weight',
  'hardcoded-lineHeight': 'line-height',
  'hardcoded-letterSpacing': 'letter-spacing',
  'hardcoded-paddingLeft': 'pad-left',
  'hardcoded-paddingRight': 'pad-right',
  'hardcoded-paddingTop': 'pad-top',
  'hardcoded-paddingBottom': 'pad-bottom',
  'hardcoded-itemSpacing': 'gap',
  'disconnected-component': 'component',
};

interface AccordionItemProps {
  nodeId: string;
  nodeName: string;
  offendingValue: string;
  issueType?: string;
  onClick: (nodeId: string) => void;
}

export function AccordionItem({
  nodeId,
  nodeName,
  offendingValue,
  issueType,
  onClick,
}: AccordionItemProps): React.ReactElement {
  const [hovered, setHovered] = React.useState(false);
  const mainText = `${nodeName} \u2014 ${offendingValue}`;
  const typeLabel = issueType !== undefined ? (TYPE_LABELS[issueType] ?? null) : null;

  return (
    <button
      onClick={() => onClick(nodeId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={mainText}
      style={{
        width: '100%',
        height: 26,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${SPACING_CONTENT}px`,
        border: 'none',
        background: hovered ? COLOR_BG_SECONDARY : 'transparent',
        cursor: 'pointer',
        gap: 6,
      }}
    >
      <span
        style={{
          flex: 1,
          textAlign: 'left',
          fontSize: 11,
          fontFamily: 'monospace',
          color: COLOR_TEXT_SECONDARY,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {mainText}
      </span>
      {typeLabel !== null && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontFamily: 'monospace',
            color: COLOR_TEXT_SECONDARY,
            opacity: 0.45,
          }}
        >
          {typeLabel}
        </span>
      )}
    </button>
  );
}

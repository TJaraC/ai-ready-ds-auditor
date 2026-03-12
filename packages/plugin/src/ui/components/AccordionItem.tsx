import React from 'react';
import { COLOR_BG_SECONDARY, COLOR_TEXT_SECONDARY, SPACING_CONTENT } from '../tokens';

interface AccordionItemProps {
  nodeId: string;
  nodeName: string;
  offendingValue: string;
  onClick: (nodeId: string) => void;
}

export function AccordionItem({
  nodeId,
  nodeName,
  offendingValue,
  onClick,
}: AccordionItemProps): React.ReactElement {
  const [hovered, setHovered] = React.useState(false);
  const text = `${nodeName} \u2014 ${offendingValue}`;

  return (
    <button
      onClick={() => onClick(nodeId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={text}
      style={{
        width: '100%',
        height: 26,
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left',
        padding: `0 ${SPACING_CONTENT}px`,
        border: 'none',
        background: hovered ? COLOR_BG_SECONDARY : 'transparent',
        cursor: 'pointer',
        fontSize: 11,
        fontFamily: 'monospace',
        color: COLOR_TEXT_SECONDARY,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </button>
  );
}

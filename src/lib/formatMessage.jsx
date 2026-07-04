import React from 'react';

/**
 * Renders a subset of Markdown as React nodes — no dangerouslySetInnerHTML,
 * so it is XSS-safe by construction (all text passes through React escaping).
 * Supports: **bold**, *italic* / _italic_, `code`, bullet + numbered lists,
 * and paragraph breaks. Deliberately small — the assistant only ever emits
 * light formatting when quoting scripture or listing points.
 */

function renderInline(text, keyPrefix) {
  const nodes = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|`([^`]+)`)/g;
  let last = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-b${i}`}>{match[2]}</strong>);
    else if (match[3] !== undefined) nodes.push(<em key={`${keyPrefix}-i${i}`}>{match[3]}</em>);
    else if (match[4] !== undefined) nodes.push(<em key={`${keyPrefix}-u${i}`}>{match[4]}</em>);
    else if (match[5] !== undefined) nodes.push(<code key={`${keyPrefix}-c${i}`}>{match[5]}</code>);
    last = match.index + match[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function formatMessage(text) {
  const lines = String(text ?? '').split('\n');
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const bullet = /^[-*•]\s+(.*)/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)/.exec(trimmed);

    if (bullet) {
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(numbered[1]);
    } else {
      flushList();
      if (trimmed) blocks.push({ type: 'p', text: trimmed });
    }
  });
  flushList();

  return blocks.map((block, i) => {
    if (block.type === 'p') {
      return <p key={i}>{renderInline(block.text, `p${i}`)}</p>;
    }
    const items = block.items.map((item, j) => (
      <li key={j}>{renderInline(item, `l${i}-${j}`)}</li>
    ));
    return block.type === 'ul' ? <ul key={i}>{items}</ul> : <ol key={i}>{items}</ol>;
  });
}

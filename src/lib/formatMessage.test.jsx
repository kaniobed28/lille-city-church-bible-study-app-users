import { render } from '@testing-library/react';
import { formatMessage } from './formatMessage';

// Helper: render the returned nodes into a container we can query.
function renderNodes(text) {
  const { container } = render(<div>{formatMessage(text)}</div>);
  return container.firstChild;
}

describe('formatMessage', () => {
  it('renders a plain paragraph', () => {
    const el = renderNodes('God is light.');
    expect(el.querySelectorAll('p')).toHaveLength(1);
    expect(el.textContent).toBe('God is light.');
  });

  it('renders **bold** as <strong>', () => {
    const el = renderNodes('This is **very** important');
    const strong = el.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong.textContent).toBe('very');
  });

  it('renders *italic* and _italic_ as <em>', () => {
    const star = renderNodes('be *still*');
    const under = renderNodes('be _still_');
    expect(star.querySelector('em').textContent).toBe('still');
    expect(under.querySelector('em').textContent).toBe('still');
  });

  it('renders `code` as <code>', () => {
    const el = renderNodes('run `npm test` now');
    expect(el.querySelector('code').textContent).toBe('npm test');
  });

  it('groups consecutive bullet lines into a single <ul>', () => {
    const el = renderNodes('- first\n- second\n- third');
    const lists = el.querySelectorAll('ul');
    expect(lists).toHaveLength(1);
    expect(lists[0].querySelectorAll('li')).toHaveLength(3);
  });

  it('groups numbered lines into a single <ol>', () => {
    const el = renderNodes('1. alpha\n2. beta');
    const lists = el.querySelectorAll('ol');
    expect(lists).toHaveLength(1);
    expect(lists[0].querySelectorAll('li')).toHaveLength(2);
  });

  it('separates a paragraph from a following list', () => {
    const el = renderNodes('Objectives:\n- understand\n- apply');
    expect(el.querySelectorAll('p')).toHaveLength(1);
    expect(el.querySelectorAll('ul li')).toHaveLength(2);
  });

  it('applies inline formatting inside list items', () => {
    const el = renderNodes('- read **John 3:16**');
    expect(el.querySelector('li strong').textContent).toBe('John 3:16');
  });

  it('does not inject raw HTML (XSS-safe)', () => {
    const el = renderNodes('<img src=x onerror=alert(1)>');
    // The angle-bracket text is escaped by React, so no <img> element exists.
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img');
  });

  it('handles empty and nullish input without throwing', () => {
    expect(formatMessage('')).toEqual([]);
    expect(formatMessage(null)).toEqual([]);
    expect(formatMessage(undefined)).toEqual([]);
  });
});

// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSnapshot } from '../shared/types';
import { AgentCard } from './AgentCard';

const agent: AgentSnapshot = {
  id: 'agent-1',
  name: 'Alpha',
  role: 'engineer',
  status: 'running',
  lastHeartbeatAt: '2026-04-11T00:00:00.000Z',
  recentWorkSummary: '최근 작업 요약',
};

describe('AgentCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders a selectable button card when onSelect is provided', async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root.render(<AgentCard agent={agent} isSelected onSelect={onSelect} />);
      await Promise.resolve();
    });

    const button = container.querySelector('button[aria-label="Alpha 상세 패널 열기"]');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSelect).toHaveBeenCalledWith(agent);
  });
});

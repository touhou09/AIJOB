// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRosterState } from '../shared/types';

const usePluginDataMock = vi.fn();
const usePluginActionMock = vi.fn();

vi.mock('@paperclipai/plugin-sdk/ui', () => ({
  usePluginData: usePluginDataMock,
  usePluginAction: usePluginActionMock,
}));

const roster: AgentRosterState = {
  companyId: 'company-1',
  agents: [
    { id: '1', name: 'Alpha', role: 'engineer', status: 'active', lastHeartbeatAt: '2026-04-11T00:00:00.000Z' },
    { id: '2', name: 'Bravo', role: 'engineer', status: 'running', lastHeartbeatAt: '2026-04-11T00:00:00.000Z' },
    { id: '3', name: 'Charlie', role: 'engineer', status: 'error', lastHeartbeatAt: '2026-04-11T00:00:00.000Z' },
    { id: '4', name: 'Delta', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:00.000Z' },
  ],
  fetchedAt: '2026-04-11T00:00:00.000Z',
  source: 'poll',
};

const refreshedRoster: AgentRosterState = {
  companyId: 'company-1',
  agents: [
    { id: '1', name: 'Alpha', role: 'engineer', status: 'error', lastHeartbeatAt: '2026-04-11T00:00:01.000Z' },
    { id: '2', name: 'Bravo', role: 'engineer', status: 'running', lastHeartbeatAt: '2026-04-11T00:00:01.000Z' },
    { id: '3', name: 'Charlie', role: 'engineer', status: 'error', lastHeartbeatAt: '2026-04-11T00:00:01.000Z' },
    { id: '4', name: 'Delta', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:01.000Z' },
  ],
  fetchedAt: '2026-04-11T00:00:01.000Z',
  source: 'poll',
};

describe('PulseWidget', () => {
  let container: HTMLDivElement;
  let root: Root;
  let refreshAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    usePluginDataMock.mockReturnValue({ data: roster, error: null, loading: false });
    refreshAction = vi.fn().mockResolvedValue(refreshedRoster);
    usePluginActionMock.mockReturnValue(refreshAction);
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
    vi.useRealTimers();
  });

  async function renderWidget() {
    const { PulseWidget } = await import('./PulseWidget');

    await act(async () => {
      root.render(<PulseWidget context={{ companyId: 'company-1' } as never} />);
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders widget counts and avatars', async () => {
    await renderWidget();

    expect(container.textContent).toContain('Doro Office Pulse');
    expect(container.textContent).toContain('Working');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('Error');
    expect(container.textContent).toContain('1');
    expect(container.querySelectorAll('[aria-label$="widget avatar"]').length).toBe(4);
  });

  it('refreshes the widget roster every second', async () => {
    await renderWidget();

    expect(refreshAction).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Error');
    expect(container.textContent).toContain('1');

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(refreshAction).toHaveBeenCalledWith({ companyId: 'company-1' });
    expect(container.textContent).toContain('Error');
    expect(container.textContent).toContain('2');
  });
});

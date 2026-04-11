// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRosterState, AgentSnapshot } from '../shared/types';
import { useOfficeStore } from './store';

const usePluginDataMock = vi.fn();
const usePluginActionMock = vi.fn();

vi.mock('@paperclipai/plugin-sdk/ui', () => ({
  usePluginData: usePluginDataMock,
  usePluginAction: usePluginActionMock,
}));

function buildAgent(index: number): AgentSnapshot {
  return {
    id: `agent-${index}`,
    name: `Agent ${index}`,
    role: 'engineer',
    status: index === 2 ? 'error' : index % 2 === 0 ? 'active' : 'idle',
    lastHeartbeatAt: `2026-04-11T00:00:0${index}.000Z`,
  };
}

const roster: AgentRosterState = {
  companyId: 'company-1',
  agents: Array.from({ length: 7 }, (_, index) => buildAgent(index + 1)),
  fetchedAt: '2026-04-11T00:00:00.000Z',
  source: 'initial',
};

const refreshedRoster: AgentRosterState = {
  companyId: 'company-1',
  agents: Array.from({ length: 7 }, (_, index) => buildAgent(index + 9)),
  fetchedAt: '2026-04-11T00:00:10.000Z',
  source: 'refresh',
};

describe('OfficePageView', () => {
  let container: HTMLDivElement;
  let root: Root;
  let refreshAction: ReturnType<typeof vi.fn>;

  async function renderOfficePage(options?: {
    data?: AgentRosterState;
    loading?: boolean;
    error?: Error | null;
    mode?: 'page' | 'sidebar';
  }) {
    usePluginDataMock.mockReturnValue({
      data: options?.data ?? roster,
      error: options?.error ?? null,
      loading: options?.loading ?? false,
    });

    const { OfficePageView } = await import('./OfficePage');

    await act(async () => {
      root.render(
        <OfficePageView context={{ companyId: 'company-1' } as never} mode={options?.mode ?? 'page'} />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useOfficeStore.getState().reset();

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

  it('renders seven cards with name, status text, and heartbeat on the page view', async () => {
    await renderOfficePage();

    expect(container.textContent).toContain('Doro Office');
    expect(container.textContent).toContain('7-card 그리드');
    expect(container.textContent).toContain('Agent 1');
    expect(container.textContent).toContain('active');
    expect(container.textContent).toContain('Heartbeat');
    expect(container.querySelectorAll('article').length).toBe(7);
  });

  it('renders the same seven-card roster in the sidebar view', async () => {
    await renderOfficePage({ mode: 'sidebar' });

    expect(container.textContent).toContain('compact card grid');
    expect(container.textContent).toContain('Agent 7');
    expect(container.querySelectorAll('article').length).toBe(7);
  });

  it('renders loading and error states for the roster flow', async () => {
    await renderOfficePage({
      loading: true,
      data: {
        companyId: 'company-1',
        agents: [],
        fetchedAt: '2026-04-11T00:00:00.000Z',
        source: 'initial',
      },
    });
    expect(container.innerHTML).toContain('do:animate-pulse');
    expect(container.querySelectorAll('[aria-label="에이전트 로스터 로딩 중"] > div').length).toBe(7);

    await renderOfficePage({
      error: new Error('network failed'),
      data: {
        companyId: 'company-1',
        agents: [],
        fetchedAt: '2026-04-11T00:00:00.000Z',
        source: 'initial',
      },
    });
    expect(container.textContent).toContain('에이전트 로스터를 불러오지 못했습니다.');
    expect(container.textContent).toContain('network failed');
  });

  it('refreshes the roster every 10 seconds without subscribing to a stream bridge', async () => {
    await renderOfficePage();

    expect(usePluginDataMock).toHaveBeenCalledWith('agent-roster', { companyId: 'company-1' });
    expect(usePluginActionMock).toHaveBeenCalledWith('refresh-agent-roster');
    expect(refreshAction).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Agent 1');
    expect(container.textContent).not.toContain('Agent 9');

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });

    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(refreshAction).toHaveBeenCalledWith({ companyId: 'company-1' });
    expect(container.textContent).toContain('Agent 9');
    expect(container.textContent).toContain('refresh');
  });
});

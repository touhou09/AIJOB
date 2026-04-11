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
  agents: Array.from({ length: 8 }, (_, index) => buildAgent(index + 1)),
  fetchedAt: '2026-04-11T00:00:00.000Z',
  source: 'initial',
};

const refreshedRoster: AgentRosterState = {
  companyId: 'company-1',
  agents: [buildAgent(9)],
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

  it('renders seven assigned seats, overflow roster, and office summary on the page view', async () => {
    await renderOfficePage();

    expect(container.textContent).toContain('오피스 레이아웃');
    expect(container.textContent).toContain('표시 옵션');
    expect(container.textContent).toContain('Assigned seats');
    expect(container.textContent).toContain('7');
    expect(container.textContent).toContain('Support desk');
    expect(container.textContent).toContain('Town hall stage');
    expect(container.textContent).toContain('Agent 1');
    expect(container.textContent).toContain('Agent 7');
    expect(container.textContent).toContain('Overflow roster');
    expect(container.textContent).toContain('Agent 8');
    expect(container.textContent).toContain('말풍선');
    expect(container.textContent).toContain('오류 강조');
    expect(container.querySelectorAll('article[aria-label$="좌석 카드"]').length).toBe(7);
  });

  it('switches to settings view and toggles display options', async () => {
    await renderOfficePage();

    const settingsTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('표시 옵션'));
    expect(settingsTab).toBeTruthy();

    await act(async () => {
      settingsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('운영자가 오피스 화면의 정보 밀도를 조절할 수 있도록');
    expect(container.textContent).toContain('overflow roster');

    const bubbleToggle = container.querySelector('button[aria-label="말풍선 표시"]');
    const issueToggle = container.querySelector('button[aria-label="오류 강조"]');
    expect(bubbleToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(issueToggle?.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      bubbleToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      issueToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(bubbleToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(issueToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(container.textContent).toContain('꺼짐');
  });

  it('renders loading and error states for the office flow', async () => {
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
    expect(container.querySelectorAll('article[aria-label$="좌석 카드"]').length).toBe(0);

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

  it('limits sidebar rendering to a short card summary', async () => {
    await renderOfficePage({ mode: 'sidebar' });

    expect(container.textContent).toContain('카드 요약으로 빠르게 확인합니다.');
    expect(container.textContent).toContain('Agent 1');
    expect(container.textContent).toContain('Agent 4');
    expect(container.textContent).not.toContain('Agent 5');
    expect(container.textContent).toContain('외 4명은 페이지 오피스 레이아웃에서 확인할 수 있습니다.');
    expect(container.querySelectorAll('article').length).toBe(4);
  });
});

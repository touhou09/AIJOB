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
    recentWorkSummary: index === 2 ? null : `Agent ${index} 최근 작업 요약`,
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
  agents: Array.from({ length: 8 }, (_, index) => ({ ...buildAgent(index + 1), status: index === 0 ? 'running' : buildAgent(index + 1).status })),
  fetchedAt: '2026-04-11T00:00:05.000Z',
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

  it('renders office seats, overflow roster, and timeline on the page view', async () => {
    await renderOfficePage();

    expect(container.textContent).toContain('오피스 레이아웃');
    expect(container.textContent).toContain('Assigned seats');
    expect(container.textContent).toContain('Support desk');
    expect(container.textContent).toContain('Town hall stage');
    expect(container.textContent).toContain('overflow roster');
    expect(container.textContent).toContain('Agent 8');
    expect(container.textContent).toContain('최근 이벤트 timeline');
    expect(container.querySelectorAll('button[aria-label$="상세 패널 열기"]').length).toBe(8);
  });

  it('switches to settings view and toggles display options', async () => {
    await renderOfficePage();

    const settingsTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('표시 옵션'));
    expect(settingsTab).toBeTruthy();

    await act(async () => {
      settingsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('레이아웃 구조');
    expect(container.textContent).toContain('말풍선 표시');
    expect(container.textContent).toContain('오류 상태 강조');
    expect(container.textContent).toContain('자동 갱신');

    const bubbleToggle = container.querySelector('button[aria-label="말풍선 표시"]');
    const highlightToggle = container.querySelector('button[aria-label="오류 상태 강조"]');
    expect(bubbleToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(highlightToggle?.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      bubbleToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      highlightToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(bubbleToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(highlightToggle?.getAttribute('aria-pressed')).toBe('false');
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

  it('opens the detail panel from a seat click and shows a fallback recent work summary', async () => {
    await renderOfficePage();

    expect(container.textContent).toContain('agent detail panel');
    expect(container.textContent).toContain('에이전트를 선택하면 이름, 역할, 현재 상태, 마지막 업데이트 시간, 최근 작업 요약을 여기에서 확인할 수 있습니다.');

    const agentButton = container.querySelector('button[aria-label="Agent 2 상세 패널 열기"]');
    expect(agentButton).toBeTruthy();

    await act(async () => {
      agentButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('이름');
    expect(container.textContent).toContain('Agent 2');
    expect(container.textContent).toContain('최근 작업 요약 데이터가 아직 없습니다.');
  });

  it('refreshes the roster every second without subscribing to a stream bridge', async () => {
    await renderOfficePage();

    expect(usePluginDataMock).toHaveBeenCalledWith('agent-roster', { companyId: 'company-1' });
    expect(usePluginActionMock).toHaveBeenCalledWith('refresh-agent-roster');
    expect(refreshAction).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Agent 1');

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(refreshAction).toHaveBeenCalledTimes(1);
    expect(refreshAction).toHaveBeenCalledWith({ companyId: 'company-1' });
    expect(container.textContent).toContain('running');
    expect(container.textContent).toContain('Agent 1');
    expect(container.textContent).toContain('idle → running');
  });
});

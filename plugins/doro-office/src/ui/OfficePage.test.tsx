// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRosterState, AgentSnapshot } from '../shared/types';
import { DEFAULT_SCENE_LAYOUT } from '../shared/scene-layout';
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
    recentWorkSummary: `Agent ${index} 최근 작업 요약`,
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

const persistedSceneLayout = {
  ...DEFAULT_SCENE_LAYOUT,
  backgroundImage: 'paperclip://persisted-office.png',
  seatLayout: DEFAULT_SCENE_LAYOUT.seatLayout.map((seat, index) =>
    index === 0
      ? {
          ...seat,
          position: { x: '20%', y: '30%' },
          layer: 4,
          nameplate: {
            position: { x: '20%', y: '38%' },
            layer: 6,
          },
        }
      : seat,
  ),
};

describe('OfficePageView', () => {
  let container: HTMLDivElement;
  let root: Root;
  let refreshAction: ReturnType<typeof vi.fn>;
  let saveSceneLayoutAction: ReturnType<typeof vi.fn>;

  async function renderOfficePage(options?: {
    data?: AgentRosterState;
    loading?: boolean;
    error?: Error | null;
    mode?: 'page' | 'sidebar';
    sceneLayout?: typeof persistedSceneLayout;
    sceneLayoutError?: Error | null;
    sceneLayoutLoading?: boolean;
  }) {
    usePluginDataMock.mockImplementation((key: string) => {
      if (key === 'scene-layout') {
        return {
          data: options?.sceneLayout ?? persistedSceneLayout,
          error: options?.sceneLayoutError ?? null,
          loading: options?.sceneLayoutLoading ?? false,
        };
      }

      return {
        data: options?.data ?? roster,
        error: options?.error ?? null,
        loading: options?.loading ?? false,
      };
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
    saveSceneLayoutAction = vi.fn().mockImplementation(async ({ layout }) => layout);
    usePluginActionMock.mockImplementation((key: string) => {
      if (key === 'save-scene-layout') {
        return saveSceneLayoutAction;
      }

      return refreshAction;
    });

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
      data: roster,
      sceneLayoutLoading: true,
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

  it('refreshes the roster every second without subscribing to a stream bridge', async () => {
    await renderOfficePage();

    expect(usePluginDataMock).toHaveBeenCalledWith('agent-roster', { companyId: 'company-1' });
    expect(usePluginDataMock).toHaveBeenCalledWith('scene-layout', { companyId: 'company-1' });
    expect(usePluginActionMock).toHaveBeenCalledWith('refresh-agent-roster');
    expect(usePluginActionMock).toHaveBeenCalledWith('save-scene-layout');
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

  it('renders scene editor controls and persists background plus nameplate layout edits', async () => {
    await renderOfficePage();

    const settingsTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('표시 옵션'));

    await act(async () => {
      settingsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('scene editor');
    expect(container.textContent).toContain('배경 이미지');
    expect(container.textContent).toContain('nameplate');
    expect(container.textContent).toContain('layer');

    const backgroundInput = container.querySelector('input[name="backgroundImage"]') as HTMLInputElement | null;
    const backgroundApply = container.querySelector('button[aria-label="scene layout 저장"]');
    const nameplateLayerInput = container.querySelector('input[name="desk-1-nameplate-layer"]') as HTMLInputElement | null;

    expect(backgroundInput?.value).toBe('paperclip://persisted-office.png');
    expect(nameplateLayerInput?.value).toBe('6');

    await act(async () => {
      if (backgroundInput) {
        backgroundInput.value = 'paperclip://sunset-office.png';
        backgroundInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (nameplateLayerInput) {
        nameplateLayerInput.value = '9';
        nameplateLayerInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      backgroundApply?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveSceneLayoutAction).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        layout: expect.objectContaining({
          backgroundImage: 'paperclip://sunset-office.png',
          seatLayout: expect.arrayContaining([
            expect.objectContaining({
              id: 'desk-1',
              nameplate: expect.objectContaining({ layer: 9 }),
            }),
          ]),
        }),
      }),
    );
  });

  it('opens a clickable detail panel for a pinned seat agent', async () => {
    await renderOfficePage();

    expect(container.textContent).toContain('agent detail panel');
    expect(container.textContent).toContain('에이전트를 선택하면');

    const pinnedAgentButton = container.querySelector('button[aria-label="Agent 1 상세 패널 열기"]');
    expect(pinnedAgentButton).toBeTruthy();

    await act(async () => {
      pinnedAgentButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Agent 1');
    expect(container.textContent).toContain('현재 상태');
    expect(container.textContent).toContain('마지막 업데이트');
    expect(container.textContent).toContain('최근 작업 요약');
    expect(container.textContent).toContain('Agent 1 최근 작업 요약');
    expect(container.textContent).toContain('2026');
  });

  it('switches the detail panel when selecting an overflow roster agent', async () => {
    await renderOfficePage();

    const overflowAgentButton = container.querySelector('button[aria-label="Agent 8 상세 패널 열기"]');
    expect(overflowAgentButton).toBeTruthy();

    await act(async () => {
      overflowAgentButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Agent 8');
    expect(container.textContent).toContain('Agent 8 최근 작업 요약');
  });

  it('drags a seat on the office canvas and persists the updated scene layout', async () => {
    await renderOfficePage();

    const dragHandle = container.querySelector('button[aria-label="Support desk 좌석 드래그 핸들"]');
    expect(dragHandle).toBeTruthy();

    await act(async () => {
      dragHandle?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 120, clientY: 180 }));
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 260, clientY: 260 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 260, clientY: 260 }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveSceneLayoutAction).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        layout: expect.objectContaining({
          seatLayout: expect.arrayContaining([
            expect.objectContaining({
              id: 'desk-1',
              position: expect.not.objectContaining({ x: '20%', y: '30%' }),
            }),
          ]),
        }),
      }),
    );
  });

  it('does not render persisted external background image URLs', async () => {
    await renderOfficePage({
      sceneLayout: {
        ...persistedSceneLayout,
        backgroundImage: 'https://attacker.example/track.png',
      },
    });

    expect(container.querySelector('[aria-label="scene background image"]')).toBeNull();
    expect(container.innerHTML).not.toContain('https://attacker.example/track.png');
  });

  it('does not render background images from malformed paperclip URLs', async () => {
    await renderOfficePage({
      sceneLayout: {
        ...persistedSceneLayout,
        backgroundImage: 'paperclip://office.png), url(https://attacker.example/track.png',
      },
    });

    expect(container.querySelector('[aria-label="scene background image"]')).toBeNull();
    expect(container.innerHTML).not.toContain('attacker.example');
  });
});

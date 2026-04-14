import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SCENE_LAYOUT } from '../shared/scene-layout';
import { useOfficeStore } from './store';

describe('useOfficeStore', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
  });

  it('starts in loading state with office view defaults', () => {
    const state = useOfficeStore.getState();
    expect(state.loading).toBe(true);
    expect(state.agents).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.companyId).toBeNull();
    expect(state.source).toBeNull();
    expect(state.activeView).toBe('office');
    expect(state.showBubbles).toBe(true);
    expect(state.highlightIssues).toBe(true);
    expect(state.recentEvents).toEqual([]);
    expect(state.sceneLayout).toEqual(DEFAULT_SCENE_LAYOUT);
  });

  it('replaces roster payload and clears errors', () => {
    useOfficeStore.getState().setError('boom');
    useOfficeStore.getState().replaceRoster({
      companyId: 'company-1',
      agents: [{ id: 'agent-1', name: 'Alpha', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:00.000Z', recentWorkSummary: null }],
      fetchedAt: '2026-04-11T00:00:00.000Z',
      source: 'poll',
    });

    const state = useOfficeStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.companyId).toBe('company-1');
    expect(state.agents).toHaveLength(1);
    expect(state.source).toBe('poll');
  });

  it('records status changes in recent events', () => {
    const store = useOfficeStore.getState();
    store.replaceRoster({
      companyId: 'company-1',
      agents: [{ id: 'agent-1', name: 'Alpha', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:00.000Z', recentWorkSummary: null }],
      fetchedAt: '2026-04-11T00:00:00.000Z',
      source: 'initial',
    });
    store.replaceRoster({
      companyId: 'company-1',
      agents: [{ id: 'agent-1', name: 'Alpha', role: 'engineer', status: 'running', lastHeartbeatAt: '2026-04-11T00:00:05.000Z', recentWorkSummary: null }],
      fetchedAt: '2026-04-11T00:00:05.000Z',
      source: 'poll',
    });

    const state = useOfficeStore.getState();
    expect(state.recentEvents).toHaveLength(1);
    expect(state.recentEvents[0]).toMatchObject({
      agentName: 'Alpha',
      previousStatus: 'idle',
      nextStatus: 'running',
    });
  });

  it('toggles settings state for the office view', () => {
    const store = useOfficeStore.getState();
    store.setActiveView('settings');
    store.toggleShowBubbles();
    store.toggleHighlightIssues();

    const state = useOfficeStore.getState();
    expect(state.activeView).toBe('settings');
    expect(state.showBubbles).toBe(false);
    expect(state.highlightIssues).toBe(false);
  });

  it('resets roster and settings state back to defaults', () => {
    const store = useOfficeStore.getState();
    store.replaceRoster({
      companyId: 'company-1',
      agents: [{ id: 'agent-1', name: 'Alpha', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:00.000Z', recentWorkSummary: null }],
      fetchedAt: '2026-04-11T00:00:00.000Z',
      source: 'refresh',
    });
    store.replaceSceneLayout({
      backgroundImage: 'paperclip://scene.png',
      seatLayout: [
        {
          id: 'desk-1',
          position: { x: '18%', y: '28%' },
          layer: 3,
          nameplate: { position: { x: '18%', y: '36%' }, layer: 4 },
        },
      ],
    });
    store.setActiveView('settings');
    store.toggleShowBubbles();
    store.toggleHighlightIssues();
    store.reset();

    const state = useOfficeStore.getState();
    expect(state.companyId).toBeNull();
    expect(state.agents).toEqual([]);
    expect(state.source).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.activeView).toBe('office');
    expect(state.showBubbles).toBe(true);
    expect(state.highlightIssues).toBe(true);
    expect(state.recentEvents).toEqual([]);
    expect(state.sceneLayout).toEqual(DEFAULT_SCENE_LAYOUT);
  });

  it('sets an error and stops loading', () => {
    useOfficeStore.getState().setError('network');
    const state = useOfficeStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('network');
  });

  it('replaces the persisted scene layout schema', () => {
    useOfficeStore.getState().replaceSceneLayout({
      backgroundImage: 'paperclip://office-scene.png',
      seatLayout: [
        {
          id: 'desk-3',
          position: { x: '58%', y: '22%' },
          layer: 6,
          nameplate: { position: { x: '58%', y: '30%' }, layer: 7 },
        },
      ],
    });

    const state = useOfficeStore.getState();
    expect(state.sceneLayout.backgroundImage).toBe('paperclip://office-scene.png');
    expect(state.sceneLayout.seatLayout[2]).toMatchObject({
      id: 'desk-3',
      position: { x: '58%', y: '22%' },
      layer: 6,
      nameplate: { position: { x: '58%', y: '30%' }, layer: 7 },
    });
    expect(state.sceneLayout.seatLayout).toHaveLength(DEFAULT_SCENE_LAYOUT.seatLayout.length);
  });

  it('allows clearing a persisted background image back to the fallback preset', () => {
    const store = useOfficeStore.getState();
    store.replaceSceneLayout({ backgroundImage: 'paperclip://scene.png' });
    store.replaceSceneLayout({ backgroundImage: null });

    expect(useOfficeStore.getState().sceneLayout.backgroundImage).toBeNull();
  });

  it('preserves existing custom seat fields when applying a partial seat patch', () => {
    const store = useOfficeStore.getState();
    store.replaceSceneLayout({
      seatLayout: [
        {
          id: 'desk-1',
          position: { x: '20%', y: '30%' },
          layer: 4,
          nameplate: { position: { x: '20%', y: '38%' }, layer: 6 },
        },
        {
          id: 'desk-2',
          position: { x: '50%', y: '35%' },
          layer: 5,
          nameplate: { position: { x: '50%', y: '43%' }, layer: 7 },
        },
      ],
    });

    store.replaceSceneLayout({
      seatLayout: [
        {
          id: 'desk-1',
          nameplate: { layer: 9 },
        },
      ],
    });

    const state = useOfficeStore.getState();
    expect(state.sceneLayout.seatLayout[0]).toMatchObject({
      id: 'desk-1',
      position: { x: '20%', y: '30%' },
      layer: 4,
      nameplate: { position: { x: '20%', y: '38%' }, layer: 9 },
    });
    expect(state.sceneLayout.seatLayout[1]).toMatchObject({
      id: 'desk-2',
      position: { x: '50%', y: '35%' },
      layer: 5,
      nameplate: { position: { x: '50%', y: '43%' }, layer: 7 },
    });
  });
});


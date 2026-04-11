import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from './store';

describe('useOfficeStore', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
  });

  it('starts in loading state with mvp-2 defaults', () => {
    const state = useOfficeStore.getState();
    expect(state.loading).toBe(true);
    expect(state.agents).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.companyId).toBeNull();
    expect(state.source).toBeNull();
    expect(state.activeView).toBe('office');
    expect(state.showBubbles).toBe(true);
    expect(state.highlightIssues).toBe(true);
  });

  it('replaces roster payload and clears errors', () => {
    useOfficeStore.getState().setError('boom');
    useOfficeStore.getState().replaceRoster({
      companyId: 'company-1',
      agents: [{ id: 'agent-1', name: 'Alpha', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:00.000Z' }],
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

  it('tracks settings view and toggle actions', () => {
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
      agents: [{ id: 'agent-1', name: 'Alpha', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:00.000Z' }],
      fetchedAt: '2026-04-11T00:00:00.000Z',
      source: 'refresh',
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
  });

  it('sets an error and stops loading', () => {
    useOfficeStore.getState().setError('network');
    const state = useOfficeStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('network');
  });
});

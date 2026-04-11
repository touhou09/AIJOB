import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from './store';

describe('useOfficeStore', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
  });

  it('starts in loading state with roster defaults', () => {
    const state = useOfficeStore.getState();
    expect(state.loading).toBe(true);
    expect(state.agents).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.companyId).toBeNull();
    expect(state.source).toBeNull();
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

  it('resets roster state back to defaults', () => {
    const store = useOfficeStore.getState();
    store.replaceRoster({
      companyId: 'company-1',
      agents: [{ id: 'agent-1', name: 'Alpha', role: 'engineer', status: 'idle', lastHeartbeatAt: '2026-04-11T00:00:00.000Z' }],
      fetchedAt: '2026-04-11T00:00:00.000Z',
      source: 'refresh',
    });
    store.reset();

    const state = useOfficeStore.getState();
    expect(state.companyId).toBeNull();
    expect(state.agents).toEqual([]);
    expect(state.source).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('sets an error and stops loading', () => {
    useOfficeStore.getState().setError('network');
    const state = useOfficeStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('network');
  });
});

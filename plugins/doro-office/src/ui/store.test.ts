import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from './store';

describe('useOfficeStore', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
  });

  it('starts in loading state', () => {
    const state = useOfficeStore.getState();

    expect(state.loading).toBe(true);
    expect(state.agents).toEqual([]);
    expect(state.error).toBeNull();
  });

  it('replaces roster payload and clears errors', () => {
    useOfficeStore.getState().setError('boom');

    useOfficeStore.getState().replaceRoster({
      companyId: 'company-1',
      agents: [
        {
          id: 'agent-1',
          name: 'Alpha',
          urlKey: 'alpha',
          role: 'engineer',
          status: 'idle',
          lastHeartbeatAt: '2026-04-11T00:00:00.000Z',
        },
      ],
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

  it('sets an error and stops loading', () => {
    useOfficeStore.getState().setError('network');

    const state = useOfficeStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('network');
  });
});

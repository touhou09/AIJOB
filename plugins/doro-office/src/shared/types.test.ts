import { describe, expect, it } from 'vitest';
import type { AgentSnapshot } from './types';

describe('AgentSnapshot type contract', () => {
  it('accepts recentWorkSummary on roster snapshots', () => {
    const snapshot: AgentSnapshot = {
      id: 'agent-1',
      name: 'Alpha',
      role: 'engineer',
      status: 'idle',
      lastHeartbeatAt: '2026-04-11T00:00:00.000Z',
      recentWorkSummary: null,
    };

    expect(snapshot.recentWorkSummary).toBeNull();
  });
});

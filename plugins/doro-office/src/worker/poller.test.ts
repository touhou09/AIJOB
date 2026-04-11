import { describe, expect, it } from 'vitest';
import { createAgentRosterPoller } from './poller';

const companyId = 'company-1';

function createAgent(name: string, status: 'idle' | 'active' = 'idle') {
  const timestamp = new Date('2026-04-11T00:00:00.000Z');
  return {
    id: `${name}-id`,
    companyId,
    name,
    urlKey: name.toLowerCase(),
    role: 'engineer' as const,
    title: null,
    icon: null,
    status,
    reportsTo: null,
    capabilities: null,
    adapterType: 'hermes_local' as const,
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: timestamp,
    metadata: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('createAgentRosterPoller', () => {
  it('publishes a sorted initial payload', async () => {
    const updates: Array<{ agents: Array<{ name: string }>; source: string }> = [];
    const poller = createAgentRosterPoller({
      companyId,
      client: {
        listAgents: async () => [createAgent('Bravo', 'active'), createAgent('Alpha', 'idle')],
      },
      onUpdate: (payload) => {
        updates.push(payload);
      },
      now: () => new Date('2026-04-11T00:00:00.000Z'),
      setIntervalFn: () => 0 as unknown as ReturnType<typeof setInterval>,
      clearIntervalFn: () => {},
    });

    const payload = await poller.start();

    expect(payload.source).toBe('initial');
    expect(payload.agents.map((agent) => agent.name)).toEqual(['Alpha', 'Bravo']);
    expect(updates).toHaveLength(1);
  });

  it('publishes an error payload when the client fails after retries', async () => {
    const updates: Array<{ error?: string; agents: unknown[] }> = [];
    const poller = createAgentRosterPoller({
      companyId,
      client: {
        listAgents: async () => {
          throw new Error('temporary outage');
        },
      },
      onUpdate: (payload) => {
        updates.push(payload);
      },
      now: () => new Date('2026-04-11T00:00:00.000Z'),
      setIntervalFn: () => 0 as unknown as ReturnType<typeof setInterval>,
      clearIntervalFn: () => {},
    });

    const payload = await poller.runNow('poll');

    expect(payload.error).toBe('temporary outage');
    expect(payload.agents).toEqual([]);
    expect(updates).toHaveLength(1);
  });
});

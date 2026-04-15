import { describe, expect, it } from 'vitest';
import { createAgentRosterPoller } from './poller';

const companyId = 'company-1';

function createAgent(name: string, status: 'idle' | 'active' = 'idle') {
  const timestamp = new Date('2026-04-11T00:00:00.000Z');
  return {
    id: `${name}-id`,
    name,
    role: 'engineer' as const,
    status,
    lastHeartbeatAt: timestamp.toISOString(),
  };
}

describe('createAgentRosterPoller', () => {
  it('uses a 1 second polling cadence by default', async () => {
    let capturedInterval = 0;
    const poller = createAgentRosterPoller({
      companyId,
      client: {
        host: 'paperclip',
        listAgents: async () => [createAgent('Alpha', 'idle')],
      },
      onUpdate: () => {},
      now: () => new Date('2026-04-11T00:00:00.000Z'),
      setIntervalFn: ((callback: () => void, delay: number) => {
        void callback;
        capturedInterval = delay;
        return 0 as unknown as ReturnType<typeof setInterval>;
      }) as typeof setInterval,
      clearIntervalFn: () => {},
    });

    await poller.start();

    expect(capturedInterval).toBe(1_000);
  });

  it('publishes a sorted initial payload with the roster host', async () => {
    const updates: Array<{ host: string; agents: Array<{ name: string }>; source: string }> = [];
    const poller = createAgentRosterPoller({
      companyId,
      client: {
        host: 'paperclip',
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

    expect(payload.host).toBe('paperclip');
    expect(payload.source).toBe('initial');
    expect(payload.agents.map((agent) => agent.name)).toEqual(['Alpha', 'Bravo']);
    expect(updates).toHaveLength(1);
  });

  it('publishes an error payload when the client fails after retries', async () => {
    const updates: Array<{ host: string; error?: string; agents: unknown[] }> = [];
    const poller = createAgentRosterPoller({
      companyId,
      client: {
        host: 'openclaw',
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

    expect(payload.host).toBe('openclaw');
    expect(payload.error).toBe('temporary outage');
    expect(payload.agents).toEqual([]);
    expect(updates).toHaveLength(1);
  });
});

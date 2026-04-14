import { describe, expect, it } from 'vitest';
import { createOpenClawRosterClient } from './openclaw-client';

describe('createOpenClawRosterClient', () => {
  it('normalizes a read-only OpenClaw roster into AgentSnapshot records', async () => {
    const client = createOpenClawRosterClient({
      loadRoster: async (companyId) => ({
        companyId,
        roster: [
          {
            agentId: 'oc-2',
            displayName: 'Beta',
            role: 'qa',
            status: 'working',
            lastSeenAt: '2026-04-14T08:00:00.000Z',
          },
          {
            id: 'oc-1',
            name: 'Alpha',
            role: 'pm',
            status: 'blocked',
            lastHeartbeatAt: 1_776_153_600_000,
          },
        ],
      }),
    });

    const agents = await client.listAgents('company-1');

    expect(client.host).toBe('openclaw');
    expect(agents).toEqual([
      {
        id: 'oc-2',
        name: 'Beta',
        role: 'qa',
        status: 'running',
        lastHeartbeatAt: '2026-04-14T08:00:00.000Z',
      },
      {
        id: 'oc-1',
        name: 'Alpha',
        role: 'pm',
        status: 'error',
        lastHeartbeatAt: '2026-04-14T08:00:00.000Z',
      },
    ]);
  });

  it('accepts a bare array payload and falls back missing names', async () => {
    const client = createOpenClawRosterClient({
      loadRoster: async () => [
        {
          slug: 'night-owl',
          title: 'Night Owl',
          status: 'offline',
        },
      ],
    });

    const agents = await client.listAgents('company-1');

    expect(agents).toEqual([
      {
        id: 'night-owl',
        name: 'Night Owl',
        role: 'engineer',
        status: 'terminated',
        lastHeartbeatAt: null,
      },
    ]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { Agent, PluginContext } from '@paperclipai/plugin-sdk';
import { createPaperclipAgentsClient } from './paperclip-client';

const timestamp = new Date('2026-04-11T00:00:00.000Z');

function createAgent(id: string, name: string): Agent {
  return {
    id,
    companyId: 'company-1',
    name,
    urlKey: name.toLowerCase(),
    role: 'engineer',
    title: null,
    icon: null,
    status: 'idle',
    reportsTo: null,
    capabilities: null,
    adapterType: 'hermes_local',
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

describe('createPaperclipAgentsClient', () => {
  it('returns agents on first successful request', async () => {
    const list = vi.fn<PluginContext['agents']['list']>().mockResolvedValue([createAgent('agent-1', 'Alpha')]);
    const client = createPaperclipAgentsClient({ agents: { list } } as unknown as Pick<PluginContext, 'agents'>);

    const agents = await client.listAgents('company-1');

    expect(agents).toHaveLength(1);
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith({ companyId: 'company-1', limit: 100 });
  });

  it('retries after an HTTP error and eventually succeeds', async () => {
    const wait = vi.fn(async () => {});
    const list = vi
      .fn<PluginContext['agents']['list']>()
      .mockRejectedValueOnce(new Error('503 unavailable'))
      .mockResolvedValueOnce([createAgent('agent-2', 'Bravo')]);
    const client = createPaperclipAgentsClient(
      { agents: { list } } as unknown as Pick<PluginContext, 'agents'>,
      { wait, retryDelayMs: 25, maxRetries: 2 },
    );

    const agents = await client.listAgents('company-1');

    expect(agents[0]?.name).toBe('Bravo');
    expect(list).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(25);
  });

  it('fails with a timeout error when the host request does not resolve in time', async () => {
    const never = new Promise<Agent[]>(() => {});
    const list = vi.fn<PluginContext['agents']['list']>().mockReturnValue(never);
    const client = createPaperclipAgentsClient(
      { agents: { list } } as unknown as Pick<PluginContext, 'agents'>,
      { timeoutMs: 5, maxRetries: 0 },
    );

    await expect(client.listAgents('company-1')).rejects.toThrow('agents lookup timed out after 5ms');
    expect(list).toHaveBeenCalledTimes(1);
  });
});

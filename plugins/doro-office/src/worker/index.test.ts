import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestHarness } from '@paperclipai/plugin-sdk/testing';
import plugin from './index';
import manifest from '../manifest';

const companyId = 'company-1';

type AgentStatus = 'idle' | 'active' | 'paused' | 'running' | 'error' | 'pending_approval' | 'terminated';

function createAgent(id: string, name: string, status: AgentStatus) {
  const timestamp = new Date('2026-04-11T00:00:00.000Z');

  return {
    id,
    companyId,
    name,
    urlKey: name.toLowerCase().replace(/\s+/g, '-'),
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
    permissions: {
      canCreateAgents: false,
    },
    lastHeartbeatAt: timestamp,
    metadata: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('doro-office worker bridge', () => {
  let harness: ReturnType<typeof createTestHarness>;

  beforeEach(async () => {
    harness = createTestHarness({ manifest });
    await plugin.definition.setup(harness.ctx);
    harness.seed({
      agents: [createAgent('agent-2', 'Bravo', 'active'), createAgent('agent-1', 'Alpha', 'idle')],
    });
  });

  it('returns sorted roster data with the paperclip host and reuses the initial fetch', async () => {
    const listSpy = vi.spyOn(harness.ctx.agents, 'list');
    const roster = await harness.getData<{
      companyId: string;
      host: string;
      source: string;
      agents: Array<{
        name: string;
        lastHeartbeatAt: string | null;
      }>;
    }>('agent-roster', { companyId });

    expect(roster.companyId).toBe(companyId);
    expect(roster.host).toBe('paperclip');
    expect(roster.source).toBe('initial');
    expect(roster.agents.map((agent) => agent.name)).toEqual(['Alpha', 'Bravo']);
    expect(roster.agents[0]?.lastHeartbeatAt).toBe('2026-04-11T00:00:00.000Z');
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it('returns an explicit error payload when company context is missing', async () => {
    const roster = await harness.getData<{ host: string; error?: string; agents: unknown[] }>('agent-roster', {});

    expect(roster.host).toBe('paperclip');
    expect(roster.error).toBe('companyId is required');
    expect(roster.agents).toEqual([]);
  });

  it('normalizes an OpenClaw read-only roster through the same data bridge contract', async () => {
    const roster = await harness.getData<{
      companyId: string;
      host: string;
      source: string;
      agents: Array<{
        id: string;
        name: string;
        status: string;
      }>;
    }>('agent-roster', {
      companyId,
      host: 'openclaw',
      roster: [
        { agentId: 'oc-2', displayName: 'Beta', role: 'qa', status: 'working' },
        { id: 'oc-1', name: 'Alpha', role: 'pm', status: 'blocked' },
      ],
    });

    expect(roster.companyId).toBe(companyId);
    expect(roster.host).toBe('openclaw');
    expect(roster.source).toBe('initial');
    expect(roster.agents).toEqual([
      { id: 'oc-1', name: 'Alpha', role: 'pm', status: 'error', lastHeartbeatAt: null },
      { id: 'oc-2', name: 'Beta', role: 'qa', status: 'running', lastHeartbeatAt: null },
    ]);
  });

  it('returns the builtin skin catalog for UI consumers', async () => {
    const skinCatalog = await harness.getData<{
      selectedSkin: string;
      skins: Array<{
        id: string;
        source: string;
      }>;
      warnings: string[];
    }>('office-skins', {});

    expect(skinCatalog.selectedSkin).toBe('dororong');
    expect(skinCatalog.skins[0]).toEqual(
      expect.objectContaining({
        id: 'dororong',
        source: 'builtin',
      }),
    );
    expect(Array.isArray(skinCatalog.warnings)).toBe(true);
  });

  it('refreshes the roster through action bridge', async () => {
    const roster = await harness.performAction<{
      companyId: string;
      host: string;
      source: string;
      agents: Array<{ name: string }>;
    }>('refresh-agent-roster', { companyId });

    expect(roster.companyId).toBe(companyId);
    expect(roster.host).toBe('paperclip');
    expect(roster.source).toBe('refresh');
    expect(roster.agents[1]?.name).toBe('Bravo');
  });
});

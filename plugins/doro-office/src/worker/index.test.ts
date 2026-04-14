import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestHarness } from '@paperclipai/plugin-sdk/testing';
import plugin from './index';
import manifest from '../manifest';
import * as skinLoader from './skin-loader';

const companyId = 'company-1';
const OFFICE_SKIN_SCOPE = {
  scopeKind: 'instance' as const,
  namespace: 'office-skins',
  stateKey: 'selected-skin',
};

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

  it('returns sorted roster data and reuses the initial fetch', async () => {
    const listSpy = vi.spyOn(harness.ctx.agents, 'list');
    const roster = await harness.getData<{
      companyId: string;
      source: string;
      agents: Array<{
        name: string;
        lastHeartbeatAt: string | null;
      }>;
    }>('agent-roster', { companyId });

    expect(roster.companyId).toBe(companyId);
    expect(roster.source).toBe('initial');
    expect(roster.agents.map((agent) => agent.name)).toEqual(['Alpha', 'Bravo']);
    expect(roster.agents[0]?.lastHeartbeatAt).toBe('2026-04-11T00:00:00.000Z');
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it('returns an explicit error payload when company context is missing', async () => {
    const roster = await harness.getData<{ error?: string; agents: unknown[] }>('agent-roster', {});

    expect(roster.error).toBe('companyId is required');
    expect(roster.agents).toEqual([]);
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

  it('persists selectedSkin through the worker action/data contract', async () => {
    vi.spyOn(skinLoader, 'loadAvailableSkins').mockImplementation(async (options = {}) => ({
      selectedSkin: options.selectedSkin === 'night-shift' ? 'night-shift' : 'dororong',
      skins: [
        {
          id: 'dororong',
          name: '도로롱',
          source: 'builtin',
          manifestPath: null,
          directoryPath: null,
          stateAssets: {},
          availableStates: ['idle'],
        },
        {
          id: 'night-shift',
          name: 'Night Shift',
          source: 'custom',
          manifestPath: '/tmp/night-shift/skin.json',
          directoryPath: '/tmp/night-shift',
          stateAssets: {},
          availableStates: ['idle'],
        },
      ],
      warnings: [],
    }));

    const updatedCatalog = await harness.performAction<{
      selectedSkin: string;
    }>('select-office-skin', { selectedSkin: 'night-shift' });

    expect(updatedCatalog.selectedSkin).toBe('night-shift');
    expect(harness.getState(OFFICE_SKIN_SCOPE)).toBe('night-shift');

    const reloadedCatalog = await harness.getData<{
      selectedSkin: string;
    }>('office-skins', {});

    expect(reloadedCatalog.selectedSkin).toBe('night-shift');
  });

  it('refreshes the roster through action bridge', async () => {
    const roster = await harness.performAction<{
      companyId: string;
      source: string;
      agents: Array<{ name: string }>;
    }>('refresh-agent-roster', { companyId });

    expect(roster.companyId).toBe(companyId);
    expect(roster.source).toBe('refresh');
    expect(roster.agents[1]?.name).toBe('Bravo');
  });
});

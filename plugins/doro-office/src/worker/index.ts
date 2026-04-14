import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import type { PluginContext } from '@paperclipai/plugin-sdk';
import type { AgentRosterPoller } from './poller';
import type { AgentRosterState, SelectOfficeSkinParams, SkinCatalog } from '../shared/types';
import { createPaperclipAgentsClient } from './paperclip-client';
import { createAgentRosterPoller } from './poller';
import { loadAvailableSkins } from './skin-loader';

const POLL_INTERVAL_MS = 1_000;
const STREAM_CHANNEL_PREFIX = 'agents:';
const OFFICE_SKINS_STATE_SCOPE = {
  scopeKind: 'instance' as const,
  namespace: 'office-skins',
  stateKey: 'selected-skin',
};

type CompanyWatcher = {
  poller: AgentRosterPoller;
  initialSync: Promise<AgentRosterState>;
};

const companyWatchers = new Map<string, CompanyWatcher>();
let workerContext: PluginContext | null = null;

function getStreamChannel(companyId: string) {
  return `${STREAM_CHANNEL_PREFIX}${companyId}`;
}

function getMissingCompanyPayload(): AgentRosterState {
  return {
    companyId: '',
    agents: [],
    fetchedAt: new Date().toISOString(),
    source: 'initial',
    error: 'companyId is required',
  };
}

function getRequestedSkinId(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

async function getSkinCatalog(ctx: PluginContext, selectedSkin?: string | null): Promise<SkinCatalog> {
  const requestedSkin = selectedSkin ?? getRequestedSkinId(await ctx.state.get(OFFICE_SKINS_STATE_SCOPE));
  const skinCatalog = await loadAvailableSkins({ selectedSkin: requestedSkin });

  for (const warning of skinCatalog.warnings) {
    ctx.logger.info('doro-office skipped custom skin manifest', {
      warning,
    });
  }

  return skinCatalog;
}

function ensureCompanyWatcher(ctx: PluginContext, companyId: string) {
  const existingWatcher = companyWatchers.get(companyId);
  if (existingWatcher) {
    return existingWatcher;
  }

  const streamChannel = getStreamChannel(companyId);
  const client = createPaperclipAgentsClient(ctx);
  const poller = createAgentRosterPoller({
    companyId,
    client,
    intervalMs: POLL_INTERVAL_MS,
    onUpdate: (payload) => {
      ctx.streams.open(streamChannel, companyId);
      ctx.streams.emit(streamChannel, payload);
      if (payload.error) {
        ctx.logger.error('doro-office failed to poll agents', {
          companyId,
          error: payload.error,
          source: payload.source,
        });
      }
    },
  });

  const watcher: CompanyWatcher = {
    poller,
    initialSync: poller.start(),
  };

  companyWatchers.set(companyId, watcher);
  return watcher;
}

const plugin = definePlugin({
  async setup(ctx) {
    workerContext = ctx;
    ctx.logger.info('doro-office worker started');

    ctx.data.register('agent-roster', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;

      if (!companyId) {
        return getMissingCompanyPayload();
      }

      const watcher = ensureCompanyWatcher(ctx, companyId);
      const cachedPayload = watcher.poller.getLastPayload();
      if (cachedPayload) {
        return cachedPayload;
      }

      return watcher.initialSync;
    });

    ctx.data.register('office-skins', async () => {
      return getSkinCatalog(ctx);
    });

    ctx.actions.register('select-office-skin', async (params) => {
      const selectedSkin = getRequestedSkinId((params as SelectOfficeSkinParams).selectedSkin);
      if (!selectedSkin) {
        throw new Error('selectedSkin is required');
      }

      const skinCatalog = await getSkinCatalog(ctx, selectedSkin);
      await ctx.state.set(OFFICE_SKINS_STATE_SCOPE, skinCatalog.selectedSkin);
      return skinCatalog;
    });

    ctx.actions.register('refresh-agent-roster', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;

      if (!companyId) {
        throw new Error('companyId is required');
      }

      const watcher = ensureCompanyWatcher(ctx, companyId);
      return watcher.poller.runNow('refresh');
    });
  },
  async onHealth() {
    return {
      status: 'ok',
      message: `Watching ${companyWatchers.size} company roster stream(s).`,
      details: {
        pollIntervalMs: POLL_INTERVAL_MS,
        watchedCompanyIds: Array.from(companyWatchers.keys()),
      },
    };
  },
  async onShutdown() {
    const ctx = workerContext;
    for (const [companyId, watcher] of companyWatchers.entries()) {
      watcher.poller.stop();
      if (ctx) {
        ctx.streams.close(getStreamChannel(companyId));
      }
      companyWatchers.delete(companyId);
    }
    workerContext = null;
  },
});

export default plugin;

runWorker(plugin, import.meta.url);

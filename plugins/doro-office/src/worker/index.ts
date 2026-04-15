import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import type { PluginContext } from '@paperclipai/plugin-sdk';
import type { AgentRosterPoller } from './poller';
import type { AgentRosterState } from '../shared/types';
import { createPaperclipAgentsClient } from './paperclip-client';
import { createOpenClawRosterClient } from './openclaw-client';
import { createAgentRosterPoller } from './poller';
import { loadAvailableSkins } from './skin-loader';

const POLL_INTERVAL_MS = 1_000;
const STREAM_CHANNEL_PREFIX = 'agents:';

type CompanyWatcher = {
  poller: AgentRosterPoller;
  initialSync: Promise<AgentRosterState>;
};

const companyWatchers = new Map<string, CompanyWatcher>();
let workerContext: PluginContext | null = null;

function getStreamChannel(companyId: string) {
  return `${STREAM_CHANNEL_PREFIX}${companyId}`;
}

function getMissingCompanyPayload(host: 'paperclip' | 'openclaw' = 'paperclip'): AgentRosterState {
  return {
    companyId: '',
    host,
    agents: [],
    fetchedAt: new Date().toISOString(),
    source: 'initial',
    error: 'companyId is required',
  };
}

function isOpenClawParams(params: unknown): params is {
  companyId?: string;
  host: 'openclaw';
  roster?: unknown;
} {
  return typeof params === 'object' && params !== null && (params as { host?: unknown }).host === 'openclaw';
}

function buildOpenClawPayload(companyId: string, source: 'initial' | 'refresh', roster: unknown) {
  const client = createOpenClawRosterClient({
    loadRoster: async () => (roster ?? []),
  });

  return client.listAgents(companyId).then((agents) => ({
    companyId,
    host: client.host,
    agents: [...agents].sort((left, right) => left.name.localeCompare(right.name)),
    fetchedAt: new Date().toISOString(),
    source,
  }));
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
        return getMissingCompanyPayload(isOpenClawParams(params) ? 'openclaw' : 'paperclip');
      }

      if (isOpenClawParams(params)) {
        return buildOpenClawPayload(companyId, 'initial', params.roster);
      }

      const watcher = ensureCompanyWatcher(ctx, companyId);
      const cachedPayload = watcher.poller.getLastPayload();
      if (cachedPayload) {
        return cachedPayload;
      }

      return watcher.initialSync;
    });

    ctx.data.register('office-skins', async () => {
      const skinCatalog = await loadAvailableSkins();
      for (const warning of skinCatalog.warnings) {
        ctx.logger.info('doro-office skipped custom skin manifest', {
          warning,
        });
      }
      return skinCatalog;
    });

    ctx.actions.register('refresh-agent-roster', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;

      if (!companyId) {
        throw new Error('companyId is required');
      }

      if (isOpenClawParams(params)) {
        return buildOpenClawPayload(companyId, 'refresh', params.roster);
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

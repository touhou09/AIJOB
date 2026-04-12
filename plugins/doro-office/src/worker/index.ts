import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import type { PluginContext } from '@paperclipai/plugin-sdk';
import type { AgentRosterPoller } from './poller';
import type { AgentRosterState } from '../shared/types';
import { createPaperclipAgentsClient } from './paperclip-client';
import { createAgentRosterPoller } from './poller';

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

function getMissingCompanyPayload(): AgentRosterState {
  return {
    companyId: '',
    agents: [],
    fetchedAt: new Date().toISOString(),
    source: 'initial',
    error: 'companyId is required',
  };
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

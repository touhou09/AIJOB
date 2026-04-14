import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import type { PluginContext } from '@paperclipai/plugin-sdk';
import type { AgentRosterPoller } from './poller';
import type { AgentRosterState } from '../shared/types';
import { DEFAULT_SCENE_LAYOUT, normalizeSceneLayout, type SceneLayoutInput } from '../shared/scene-layout';
import { createPaperclipAgentsClient } from './paperclip-client';
import { createAgentRosterPoller } from './poller';
import { loadAvailableSkins } from './skin-loader';

const POLL_INTERVAL_MS = 1_000;
const STREAM_CHANNEL_PREFIX = 'agents:';
const SCENE_LAYOUT_NAMESPACE = 'scene-layout';
const SCENE_LAYOUT_STATE_KEY = 'layout';

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

function getSceneLayoutScope(companyId: string) {
  return {
    scopeKind: 'company' as const,
    scopeId: companyId,
    namespace: SCENE_LAYOUT_NAMESPACE,
    stateKey: SCENE_LAYOUT_STATE_KEY,
  };
}

async function loadSceneLayout(ctx: PluginContext, companyId: string) {
  const stored = (await ctx.state.get(getSceneLayoutScope(companyId))) as SceneLayoutInput | null;
  return stored ? normalizeSceneLayout(stored) : DEFAULT_SCENE_LAYOUT;
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
      const skinCatalog = await loadAvailableSkins();
      for (const warning of skinCatalog.warnings) {
        ctx.logger.info('doro-office skipped custom skin manifest', {
          warning,
        });
      }
      return skinCatalog;
    });

    ctx.data.register('scene-layout', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;
      if (!companyId) {
        return DEFAULT_SCENE_LAYOUT;
      }
      return loadSceneLayout(ctx, companyId);
    });

    ctx.actions.register('refresh-agent-roster', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;

      if (!companyId) {
        throw new Error('companyId is required');
      }

      const watcher = ensureCompanyWatcher(ctx, companyId);
      return watcher.poller.runNow('refresh');
    });

    ctx.actions.register('save-scene-layout', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;
      if (!companyId) {
        throw new Error('companyId is required');
      }

      const layoutInput = typeof params.layout === 'object' && params.layout ? (params.layout as SceneLayoutInput) : {};
      const currentLayout = await loadSceneLayout(ctx, companyId);
      const mergedLayout = normalizeSceneLayout({
        ...currentLayout,
        ...layoutInput,
        backgroundImage: layoutInput.backgroundImage !== undefined ? layoutInput.backgroundImage : currentLayout.backgroundImage,
        seatLayout: layoutInput.seatLayout
          ? currentLayout.seatLayout.map((seat) => {
              const patch = layoutInput.seatLayout?.find((nextSeat) => nextSeat.id === seat.id);
              if (!patch) {
                return seat;
              }

              return {
                ...seat,
                ...patch,
                position: {
                  ...seat.position,
                  ...patch.position,
                },
                size: {
                  ...seat.size,
                  ...patch.size,
                },
                visibleOn: patch.visibleOn ?? seat.visibleOn,
                nameplate: {
                  ...seat.nameplate,
                  ...patch.nameplate,
                  position: {
                    ...seat.nameplate.position,
                    ...patch.nameplate?.position,
                  },
                },
              };
            })
          : currentLayout.seatLayout,
      });
      await ctx.state.set(getSceneLayoutScope(companyId), mergedLayout);
      return mergedLayout;
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

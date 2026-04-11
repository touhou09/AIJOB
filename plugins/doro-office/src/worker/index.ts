import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import type { Agent, PluginContext } from '@paperclipai/plugin-sdk';
import type { AgentRosterPayload, AgentRosterSource, AgentRosterState, AgentSnapshot } from '../shared/types';

const POLL_INTERVAL_MS = 10_000;
const STREAM_CHANNEL_PREFIX = 'agents:';
const MAX_AGENT_COUNT = 100;

type CompanyWatcher = {
  stop: () => void;
  lastPayload: AgentRosterPayload | null;
};

const companyWatchers = new Map<string, CompanyWatcher>();

function getStreamChannel(companyId: string) {
  return `${STREAM_CHANNEL_PREFIX}${companyId}`;
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toAgentSnapshot(agent: Agent): AgentSnapshot {
  return {
    id: agent.id,
    name: agent.name,
    urlKey: agent.urlKey,
    role: agent.role,
    status: agent.status,
    lastHeartbeatAt: toIsoString(agent.lastHeartbeatAt),
  };
}

function toAgentSnapshots(agents: Agent[]) {
  return agents.map(toAgentSnapshot).sort((left, right) => left.name.localeCompare(right.name));
}

function buildPayload(companyId: string, agents: Agent[], source: AgentRosterSource): AgentRosterPayload {
  return {
    companyId,
    agents: toAgentSnapshots(agents),
    fetchedAt: new Date().toISOString(),
    source,
  };
}

function hasRosterChanged(previous: AgentRosterPayload | null, next: AgentRosterPayload) {
  if (!previous) {
    return true;
  }

  if (previous.agents.length !== next.agents.length) {
    return true;
  }

  return previous.agents.some((agent, index) => {
    const nextAgent = next.agents[index];

    return (
      nextAgent === undefined ||
      agent.id !== nextAgent.id ||
      agent.name !== nextAgent.name ||
      agent.urlKey !== nextAgent.urlKey ||
      agent.role !== nextAgent.role ||
      agent.status !== nextAgent.status ||
      agent.lastHeartbeatAt !== nextAgent.lastHeartbeatAt
    );
  });
}

async function fetchRoster(ctx: PluginContext, companyId: string, source: AgentRosterSource) {
  const agents = await ctx.agents.list({ companyId, limit: MAX_AGENT_COUNT });
  return buildPayload(companyId, agents, source);
}

function ensureCompanyWatcher(ctx: PluginContext, companyId: string) {
  const existingWatcher = companyWatchers.get(companyId);
  if (existingWatcher) {
    return existingWatcher;
  }

  const streamChannel = getStreamChannel(companyId);
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let lastPayload: AgentRosterPayload | null = null;

  const syncRoster = async (source: AgentRosterSource) => {
    try {
      const nextPayload = await fetchRoster(ctx, companyId, source);
      const changed = hasRosterChanged(lastPayload, nextPayload);
      lastPayload = nextPayload;

      if (changed) {
        ctx.streams.open(streamChannel, companyId);
        ctx.streams.emit(streamChannel, nextPayload);
      }
    } catch (error) {
      ctx.logger.error('doro-office failed to poll agents', {
        companyId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  void syncRoster('initial');
  pollTimer = setInterval(() => {
    void syncRoster('poll');
  }, POLL_INTERVAL_MS);

  const watcher: CompanyWatcher = {
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      ctx.streams.close(streamChannel);
      companyWatchers.delete(companyId);
    },
    get lastPayload() {
      return lastPayload;
    },
    set lastPayload(value: AgentRosterPayload | null) {
      lastPayload = value;
    },
  };

  companyWatchers.set(companyId, watcher);
  return watcher;
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

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info('doro-office worker started');

    ctx.data.register('agent-roster', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;

      if (!companyId) {
        return getMissingCompanyPayload();
      }

      const watcher = ensureCompanyWatcher(ctx, companyId);
      if (watcher.lastPayload) {
        return watcher.lastPayload;
      }

      const payload = await fetchRoster(ctx, companyId, 'initial');
      watcher.lastPayload = payload;
      return payload;
    });

    ctx.actions.register('refresh-agent-roster', async (params) => {
      const companyId = typeof params.companyId === 'string' ? params.companyId : null;

      if (!companyId) {
        throw new Error('companyId is required');
      }

      const watcher = ensureCompanyWatcher(ctx, companyId);
      const payload = await fetchRoster(ctx, companyId, 'refresh');
      watcher.lastPayload = payload;
      ctx.streams.open(getStreamChannel(companyId), companyId);
      ctx.streams.emit(getStreamChannel(companyId), payload);

      return payload;
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
    for (const watcher of companyWatchers.values()) {
      watcher.stop();
    }
  },
});

export default plugin;

runWorker(plugin, import.meta.url);

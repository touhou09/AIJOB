import type { Agent } from '@paperclipai/plugin-sdk';
import type { AgentRosterPayload, AgentRosterSource, AgentRosterState, AgentSnapshot } from '../shared/types';
import type { PaperclipAgentsClient } from './paperclip-client';

const DEFAULT_POLL_INTERVAL_MS = 10_000;

type UpdateCallback = (payload: AgentRosterState) => void;

type PollerTimer = ReturnType<typeof setInterval>;

type PollerOptions = {
  companyId: string;
  client: PaperclipAgentsClient;
  onUpdate: UpdateCallback;
  intervalMs?: number;
  now?: () => Date;
  setIntervalFn?: (callback: () => void, delay: number) => PollerTimer;
  clearIntervalFn?: (timer: PollerTimer) => void;
};

export type AgentRosterPoller = {
  start: () => Promise<AgentRosterState>;
  runNow: (source: AgentRosterSource) => Promise<AgentRosterState>;
  stop: () => void;
  getLastPayload: () => AgentRosterState | null;
};

function toIsoString(value: Date | string | null) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return value.toISOString();
}

function toAgentSnapshot(agent: Agent): AgentSnapshot {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    lastHeartbeatAt: toIsoString(agent.lastHeartbeatAt),
  };
}

function buildPayload(companyId: string, agents: Agent[], source: AgentRosterSource, now: () => Date): AgentRosterPayload {
  return {
    companyId,
    agents: agents.map(toAgentSnapshot).sort((left, right) => left.name.localeCompare(right.name)),
    fetchedAt: now().toISOString(),
    source,
  };
}

function buildErrorPayload(companyId: string, source: AgentRosterSource, now: () => Date, error: unknown): AgentRosterState {
  return {
    companyId,
    agents: [],
    fetchedAt: now().toISOString(),
    source,
    error: error instanceof Error ? error.message : String(error),
  };
}

function hasRosterChanged(previous: AgentRosterState | null, next: AgentRosterState) {
  if (!previous) {
    return true;
  }

  if (previous.error !== next.error) {
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
      agent.role !== nextAgent.role ||
      agent.status !== nextAgent.status ||
      agent.lastHeartbeatAt !== nextAgent.lastHeartbeatAt
    );
  });
}

export function createAgentRosterPoller(options: PollerOptions): AgentRosterPoller {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const now = options.now ?? (() => new Date());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  let timer: PollerTimer | null = null;
  let lastPayload: AgentRosterState | null = null;
  let started = false;
  let stopped = false;

  const sync = async (source: AgentRosterSource) => {
    try {
      const agents = await options.client.listAgents(options.companyId);
      const nextPayload = buildPayload(options.companyId, agents, source, now);
      if (hasRosterChanged(lastPayload, nextPayload)) {
        lastPayload = nextPayload;
        options.onUpdate(nextPayload);
      } else {
        lastPayload = nextPayload;
      }

      return nextPayload;
    } catch (error) {
      const errorPayload = buildErrorPayload(options.companyId, source, now, error);
      if (hasRosterChanged(lastPayload, errorPayload)) {
        lastPayload = errorPayload;
        options.onUpdate(errorPayload);
      } else {
        lastPayload = errorPayload;
      }

      return errorPayload;
    }
  };

  return {
    async start() {
      if (!started) {
        started = true;
        timer = setIntervalFn(() => {
          void sync('poll');
        }, intervalMs);
      }

      return sync('initial');
    },
    runNow(source) {
      return sync(source);
    },
    stop() {
      if (stopped) {
        return;
      }

      stopped = true;
      if (timer) {
        clearIntervalFn(timer);
        timer = null;
      }
    },
    getLastPayload() {
      return lastPayload;
    },
  };
}

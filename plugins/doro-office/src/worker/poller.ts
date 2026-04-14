import type { Agent } from '@paperclipai/plugin-sdk';
import type { AgentRosterPayload, AgentRosterSource, AgentRosterState, AgentSnapshot } from '../shared/types';
import type { PaperclipAgentsClient } from './paperclip-client';

const DEFAULT_POLL_INTERVAL_MS = 1_000;

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

function summarizeRecentWork(agent: Agent) {
  if (typeof agent.title === 'string' && agent.title.trim().length > 0) {
    return agent.title.trim();
  }

  switch (agent.status) {
    case 'active':
    case 'running':
      return `${agent.role} 에이전트가 최근 작업을 진행 중입니다.`;
    case 'error':
      return `${agent.role} 에이전트가 최근 오류를 보고했습니다.`;
    case 'pending_approval':
      return `${agent.role} 에이전트의 최근 작업이 승인 대기 중입니다.`;
    case 'paused':
    case 'terminated':
      return `${agent.role} 에이전트가 최근 작업 이후 일시 정지 상태입니다.`;
    default:
      return `${agent.role} 에이전트가 최근 작업 이후 대기 중입니다.`;
  }
}

function toAgentSnapshot(agent: Agent): AgentSnapshot {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    lastHeartbeatAt: toIsoString(agent.lastHeartbeatAt),
    recentWorkSummary: summarizeRecentWork(agent),
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
      agent.lastHeartbeatAt !== nextAgent.lastHeartbeatAt ||
      agent.recentWorkSummary !== nextAgent.recentWorkSummary
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

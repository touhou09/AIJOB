import type { Agent, PluginContext } from '@paperclipai/plugin-sdk';
import type { AgentRosterHost, AgentSnapshot } from '../shared/types';

const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 200;
const MAX_AGENT_COUNT = 100;

export type AgentRosterClient = {
  host: AgentRosterHost;
  listAgents: (companyId: string) => Promise<AgentSnapshot[]>;
};

type WaitFn = (ms: number) => Promise<void>;

export type PaperclipAgentsClientOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  wait?: WaitFn;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`agents lookup timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function createPaperclipAgentsClient(
  ctx: Pick<PluginContext, 'agents'>,
  options: PaperclipAgentsClientOptions = {},
): AgentRosterClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const wait = options.wait ?? delay;

  return {
    host: 'paperclip',
    async listAgents(companyId: string) {
      let attempt = 0;

      while (true) {
        try {
          const agents = await withTimeout(ctx.agents.list({ companyId, limit: MAX_AGENT_COUNT }), timeoutMs);
          return agents.map(toAgentSnapshot);
        } catch (error) {
          const normalizedError = normalizeError(error);
          if (attempt >= maxRetries) {
            throw normalizedError;
          }

          attempt += 1;
          await wait(retryDelayMs * attempt);
        }
      }
    },
  };
}

import type { Agent, PluginContext } from '@paperclipai/plugin-sdk';

const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 200;
const MAX_AGENT_COUNT = 100;

export type PaperclipAgentsClient = {
  listAgents: (companyId: string) => Promise<Agent[]>;
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
): PaperclipAgentsClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const wait = options.wait ?? delay;

  return {
    async listAgents(companyId: string) {
      let attempt = 0;

      while (true) {
        try {
          return await withTimeout(ctx.agents.list({ companyId, limit: MAX_AGENT_COUNT }), timeoutMs);
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

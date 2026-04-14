import type { Agent } from '@paperclipai/plugin-sdk';
import type { AgentRosterClient } from './paperclip-client';
import type { AgentSnapshot } from '../shared/types';

type OpenClawRosterEntry = {
  id?: string;
  agentId?: string;
  slug?: string;
  name?: string;
  displayName?: string;
  title?: string;
  role?: Agent['role'];
  status?: string | null;
  lastHeartbeatAt?: string | number | Date | null;
  lastSeenAt?: string | number | Date | null;
};

type OpenClawRosterPayload =
  | OpenClawRosterEntry[]
  | {
      companyId?: string;
      roster?: OpenClawRosterEntry[];
      agents?: OpenClawRosterEntry[];
      members?: OpenClawRosterEntry[];
    };

type OpenClawRosterLoader = (companyId: string) => Promise<OpenClawRosterPayload>;

export type OpenClawRosterClientOptions = {
  loadRoster: OpenClawRosterLoader;
};

function toIsoString(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeOpenClawStatus(status: string | null | undefined): Agent['status'] {
  const normalized = status?.trim().toLowerCase();

  switch (normalized) {
    case 'running':
    case 'working':
    case 'busy':
    case 'active':
      return 'running';
    case 'blocked':
    case 'error':
    case 'failed':
      return 'error';
    case 'paused':
    case 'sleeping':
      return 'paused';
    case 'offline':
    case 'terminated':
      return 'terminated';
    case 'pending':
    case 'pending_approval':
      return 'pending_approval';
    case 'idle':
    case 'waiting':
    default:
      return 'idle';
  }
}

function normalizeOpenClawEntry(entry: OpenClawRosterEntry): AgentSnapshot {
  const id = entry.id ?? entry.agentId ?? entry.slug ?? entry.name ?? entry.displayName ?? entry.title ?? 'unknown-agent';
  const name = entry.name ?? entry.displayName ?? entry.title ?? id;

  return {
    id,
    name,
    role: entry.role ?? 'engineer',
    status: normalizeOpenClawStatus(entry.status),
    lastHeartbeatAt: toIsoString(entry.lastHeartbeatAt ?? entry.lastSeenAt),
  };
}

function getRosterEntries(payload: OpenClawRosterPayload): OpenClawRosterEntry[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.roster ?? payload.agents ?? payload.members ?? [];
}

export function createOpenClawRosterClient(options: OpenClawRosterClientOptions): AgentRosterClient {
  return {
    host: 'openclaw',
    async listAgents(companyId: string) {
      const payload = await options.loadRoster(companyId);
      return getRosterEntries(payload).map(normalizeOpenClawEntry);
    },
  };
}

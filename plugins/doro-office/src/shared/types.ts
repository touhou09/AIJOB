import type { Agent } from '@paperclipai/plugin-sdk';

export type AgentSnapshot = {
  id: string;
  name: string;
  urlKey: string;
  role: Agent['role'];
  status: Agent['status'];
  lastHeartbeatAt: string | null;
};

export type AgentRosterSource = 'initial' | 'poll' | 'refresh';

export type AgentRosterPayload = {
  companyId: string;
  agents: AgentSnapshot[];
  fetchedAt: string;
  source: AgentRosterSource;
};

export type AgentRosterState = AgentRosterPayload & {
  error?: string;
};

import type { Agent } from '@paperclipai/plugin-sdk';
import type { SceneLayout, SceneSeatLayout, SceneSeatNameplateLayout, SceneSurface } from './scene-layout';

export type DororongVisualState = 'idle' | 'working' | 'error' | 'sleeping';

export type AgentIssueSnapshot = {
  id: string;
  identifier: string;
  title: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked';
  updatedAt: string;
};

export type DororongPresentation = {
  visualState: DororongVisualState;
  bubbleText: string;
  statusText: string;
  fallbackReason: 'issue' | 'title' | 'default';
  currentIssue: AgentIssueSnapshot | null;
};

export type AgentSnapshot = {
  id: string;
  name: string;
  role: Agent['role'];
  status: Agent['status'];
  lastHeartbeatAt: string | null;
  recentWorkSummary: string | null;
};

export type AgentRosterSource = 'initial' | 'poll' | 'refresh';

export type SkinSource = 'builtin' | 'custom';

export type SkinStateAssets = Partial<Record<DororongVisualState, string>>;

export type SkinMetadata = {
  id: string;
  name: string;
  source: SkinSource;
  manifestPath: string | null;
  directoryPath: string | null;
  stateAssets: SkinStateAssets;
  availableStates: DororongVisualState[];
  author?: string;
  description?: string;
};

export type SkinCatalog = {
  selectedSkin: string;
  skins: SkinMetadata[];
  warnings: string[];
};

export type AgentRosterPayload = {
  companyId: string;
  agents: AgentSnapshot[];
  fetchedAt: string;
  source: AgentRosterSource;
};

export type AgentRosterState = AgentRosterPayload & {
  error?: string;
};

export type { SceneLayout, SceneSeatLayout, SceneSeatNameplateLayout, SceneSurface };

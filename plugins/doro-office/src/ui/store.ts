import { create } from 'zustand';
import { DEFAULT_SCENE_LAYOUT, normalizeSceneLayout } from '../shared/scene-layout';
import type { SceneLayoutInput } from '../shared/scene-layout';
import type { AgentRosterPayload, AgentSnapshot, SceneLayout } from '../shared/types';

const MAX_TIMELINE_EVENTS = 10;

export type OfficeViewMode = 'office' | 'settings';

export type TimelineEvent = {
  id: string;
  agentId: string;
  agentName: string;
  nextStatus: AgentSnapshot['status'];
  previousStatus: AgentSnapshot['status'] | null;
  occurredAt: string;
};

type OfficeStoreState = {
  companyId: string | null;
  agents: AgentSnapshot[];
  fetchedAt: string | null;
  source: AgentRosterPayload['source'] | null;
  loading: boolean;
  error: string | null;
  activeView: OfficeViewMode;
  showBubbles: boolean;
  highlightIssues: boolean;
  recentEvents: TimelineEvent[];
  sceneLayout: SceneLayout;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  replaceRoster: (payload: AgentRosterPayload) => void;
  replaceSceneLayout: (layout: SceneLayoutInput) => void;
  setActiveView: (view: OfficeViewMode) => void;
  toggleShowBubbles: () => void;
  toggleHighlightIssues: () => void;
  reset: () => void;
};

function buildTimelineEvents(previousAgents: AgentSnapshot[], nextAgents: AgentSnapshot[], occurredAt: string) {
  const previousById = new Map(previousAgents.map((agent) => [agent.id, agent]));

  return nextAgents.flatMap<TimelineEvent>((agent) => {
    const previous = previousById.get(agent.id);
    if (!previous || previous.status === agent.status) {
      return [];
    }

    return [
      {
        id: `${agent.id}:${occurredAt}`,
        agentId: agent.id,
        agentName: agent.name,
        previousStatus: previous.status,
        nextStatus: agent.status,
        occurredAt,
      },
    ];
  });
}

const initialState = {
  companyId: null,
  agents: [] as AgentSnapshot[],
  fetchedAt: null,
  source: null as AgentRosterPayload['source'] | null,
  loading: true,
  error: null,
  activeView: 'office' as OfficeViewMode,
  showBubbles: true,
  highlightIssues: true,
  recentEvents: [] as TimelineEvent[],
  sceneLayout: DEFAULT_SCENE_LAYOUT,
};

export const useOfficeStore = create<OfficeStoreState>((set) => ({
  ...initialState,
  setLoading: (loading) => {
    set({ loading });
  },
  setError: (error) => {
    set({ error, loading: false });
  },
  replaceRoster: (payload) => {
    set((state) => ({
      companyId: payload.companyId,
      agents: payload.agents,
      fetchedAt: payload.fetchedAt,
      source: payload.source,
      loading: false,
      error: null,
      recentEvents: [...buildTimelineEvents(state.agents, payload.agents, payload.fetchedAt), ...state.recentEvents].slice(0, MAX_TIMELINE_EVENTS),
    }));
  },
  replaceSceneLayout: (layout) => {
    set((state) => ({
      sceneLayout: normalizeSceneLayout({
        ...state.sceneLayout,
        ...layout,
        backgroundImage: layout.backgroundImage ?? state.sceneLayout.backgroundImage,
        seatLayout: layout.seatLayout ?? state.sceneLayout.seatLayout,
      }),
    }));
  },
  setActiveView: (activeView) => {
    set({ activeView });
  },
  toggleShowBubbles: () => {
    set((state) => ({ showBubbles: !state.showBubbles }));
  },
  toggleHighlightIssues: () => {
    set((state) => ({ highlightIssues: !state.highlightIssues }));
  },
  reset: () => {
    set(initialState);
  },
}));

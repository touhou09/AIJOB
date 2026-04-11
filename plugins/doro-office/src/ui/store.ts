import { create } from 'zustand';
import type { AgentRosterPayload, AgentSnapshot } from '../shared/types';

type OfficeView = 'office' | 'settings';

type OfficeStoreState = {
  companyId: string | null;
  agents: AgentSnapshot[];
  fetchedAt: string | null;
  source: AgentRosterPayload['source'] | null;
  loading: boolean;
  error: string | null;
  activeView: OfficeView;
  showBubbles: boolean;
  highlightIssues: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  replaceRoster: (payload: AgentRosterPayload) => void;
  setActiveView: (view: OfficeView) => void;
  toggleShowBubbles: () => void;
  toggleHighlightIssues: () => void;
  reset: () => void;
};

const initialState = {
  companyId: null,
  agents: [] as AgentSnapshot[],
  fetchedAt: null,
  source: null as AgentRosterPayload['source'] | null,
  loading: true,
  error: null,
  activeView: 'office' as OfficeView,
  showBubbles: true,
  highlightIssues: true,
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
    set({
      companyId: payload.companyId,
      agents: payload.agents,
      fetchedAt: payload.fetchedAt,
      source: payload.source,
      loading: false,
      error: null,
    });
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

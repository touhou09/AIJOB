import { useCallback, useEffect, useState } from 'react';
import { usePluginAction, usePluginData } from '@paperclipai/plugin-sdk/ui';
import type { AgentRosterState } from '../shared/types';

export const AUTO_REFRESH_INTERVAL_MS = 1_000;

export function useAutoRefreshingRoster(companyId: string | null | undefined) {
  const dataQuery = usePluginData<AgentRosterState>('agent-roster', { companyId });
  const refreshRoster = usePluginAction('refresh-agent-roster');
  const [roster, setRoster] = useState<AgentRosterState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRoster(null);
    setError(null);
    setLoading(true);
  }, [companyId]);

  useEffect(() => {
    setLoading(dataQuery.loading);
  }, [dataQuery.loading]);

  useEffect(() => {
    if (dataQuery.loading) {
      return;
    }

    if (dataQuery.error) {
      setError(dataQuery.error.message);
      return;
    }

    if (dataQuery.data?.error) {
      setRoster(dataQuery.data);
      setError(dataQuery.data.error);
      return;
    }

    if (dataQuery.data) {
      setRoster(dataQuery.data);
      setError(null);
    }
  }, [dataQuery.data, dataQuery.error, dataQuery.loading]);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!companyId) {
        return null;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const payload = (await refreshRoster({ companyId })) as AgentRosterState;
        setRoster(payload);
        setError(payload.error ?? null);
        setLoading(false);
        return payload;
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : 'Failed to refresh roster';
        setError(message);
        setLoading(false);
        return null;
      }
    },
    [companyId, refreshRoster],
  );

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [companyId, refresh]);

  return {
    roster,
    loading,
    error,
    refresh,
  };
}

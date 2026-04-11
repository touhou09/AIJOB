import { useCallback, useEffect } from 'react';
import { usePluginAction, usePluginData } from '@paperclipai/plugin-sdk/ui';
import type { PluginHostContext } from '@paperclipai/plugin-sdk/ui';
import type { AgentRosterState } from '../shared/types';
import { AgentCard } from './AgentCard';
import { useOfficeStore } from './store';

const AUTO_REFRESH_INTERVAL_MS = 10_000;
const GRID_CLASSES = 'do:grid do:grid-cols-2 do:gap-3 md:do:grid-cols-3 lg:do:grid-cols-4';

type OfficePageViewProps = {
  context: PluginHostContext;
  mode: 'page' | 'sidebar';
};

export function OfficePageView({ context, mode }: OfficePageViewProps) {
  const companyId = context.companyId;
  const dataQuery = usePluginData<AgentRosterState>('agent-roster', { companyId });
  const refreshRoster = usePluginAction('refresh-agent-roster');

  const {
    agents,
    companyId: storeCompanyId,
    fetchedAt,
    source,
    loading,
    error,
    replaceRoster,
    setError,
    setLoading,
    reset,
  } = useOfficeStore((state) => state);

  useEffect(() => {
    reset();
  }, [companyId, reset]);

  useEffect(() => {
    setLoading(dataQuery.loading);
  }, [dataQuery.loading, setLoading]);

  useEffect(() => {
    if (dataQuery.loading) {
      return;
    }

    if (dataQuery.error) {
      setError(dataQuery.error.message);
      return;
    }

    if (dataQuery.data?.error) {
      setError(dataQuery.data.error);
      return;
    }

    if (dataQuery.data) {
      replaceRoster(dataQuery.data);
    }
  }, [dataQuery.data, dataQuery.error, dataQuery.loading, replaceRoster, setError]);

  const handleRefresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!companyId) {
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const payload = await refreshRoster({ companyId });
        replaceRoster(payload as AgentRosterState);
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : 'Failed to refresh roster';
        setError(message);
      }
    },
    [companyId, refreshRoster, replaceRoster, setError, setLoading],
  );

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void handleRefresh({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [companyId, handleRefresh]);

  const effectiveCompanyId = storeCompanyId ?? companyId;
  const isEmpty = !loading && !error && agents.length === 0;
  const description =
    mode === 'page'
      ? '현재 회사 컨텍스트의 에이전트 상태를 7-card 그리드로 표시합니다.'
      : '페이지와 동일한 roster를 compact card grid로 빠르게 확인합니다.';

  return (
    <section className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-orange-50/40 do:p-4 do:text-slate-900 md:do:p-6">
      <header className="do:flex do:flex-col do:gap-4 do:rounded-3xl do:bg-white do:p-5 do:shadow-sm">
        <div className="do:flex do:flex-wrap do:items-start do:justify-between do:gap-4">
          <div className="do:min-w-0 do:flex-1">
            <div className="do:flex do:items-center do:gap-3">
              <div aria-hidden="true" className="do:flex do:size-12 do:items-center do:justify-center do:rounded-full do:bg-orange-100 do:text-xl">
                🏢
              </div>
              <div className="do:min-w-0">
                <h1 className="do:text-lg do:font-semibold do:text-slate-950">Doro Office</h1>
                <p className="do:text-sm do:leading-6 do:text-slate-600">{description}</p>
              </div>
            </div>
          </div>

          <button
            className="do:inline-flex do:items-center do:justify-center do:rounded-full do:bg-orange-500 do:px-4 do:py-2 do:text-sm do:font-semibold do:text-white do:transition hover:do:bg-orange-600 focus-visible:do:outline-2 focus-visible:do:outline-offset-2 focus-visible:do:outline-orange-500 disabled:do:cursor-not-allowed disabled:do:bg-orange-300"
            disabled={!companyId}
            onClick={() => {
              void handleRefresh();
            }}
            type="button"
          >
            새로고침
          </button>
        </div>

        <dl className="do:grid do:gap-3 sm:do:grid-cols-2 xl:do:grid-cols-4">
          <StatusCard label="Company" value={effectiveCompanyId ?? 'No company context'} />
          <StatusCard label="Agents" value={String(agents.length)} />
          <StatusCard label="Source" value={source ?? 'waiting'} />
          <StatusCard label="Updated" value={fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : 'waiting'} />
        </dl>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={handleRefresh} /> : null}
      {isEmpty ? <EmptyState /> : null}

      {!loading && !error && agents.length > 0 ? (
        <div className={GRID_CLASSES}>
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
};

function StatusCard({ label, value }: StatusCardProps) {
  return (
    <div className="do:rounded-2xl do:bg-slate-50 do:p-4">
      <dt className="do:text-xs do:font-medium do:uppercase do:tracking-wide do:text-slate-500">{label}</dt>
      <dd className="do:mt-1 do:break-all do:text-sm do:font-medium do:text-slate-900">{value}</dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-label="에이전트 로스터 로딩 중" className={GRID_CLASSES}>
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="do:animate-pulse do:rounded-3xl do:border do:border-orange-100 do:bg-white do:p-5 do:shadow-sm">
          <div className="do:flex do:items-center do:gap-4">
            <div className="do:size-16 do:rounded-full do:bg-orange-100" />
            <div className="do:flex-1 do:space-y-2">
              <div className="do:h-4 do:w-24 do:rounded-full do:bg-orange-100" />
              <div className="do:h-3 do:w-16 do:rounded-full do:bg-orange-50" />
            </div>
          </div>
          <div className="do:mt-4 do:h-12 do:rounded-2xl do:bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry: () => Promise<void>;
};

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="do:rounded-3xl do:border do:border-rose-200 do:bg-rose-50 do:p-6 do:text-rose-900">
      <h2 className="do:text-base do:font-semibold">에이전트 로스터를 불러오지 못했습니다.</h2>
      <p className="do:mt-2 do:text-sm do:leading-6">{message}</p>
      <button
        className="do:mt-4 do:inline-flex do:items-center do:justify-center do:rounded-full do:bg-rose-600 do:px-4 do:py-2 do:text-sm do:font-semibold do:text-white hover:do:bg-rose-700 focus-visible:do:outline-2 focus-visible:do:outline-offset-2 focus-visible:do:outline-rose-500"
        onClick={() => {
          void onRetry();
        }}
        type="button"
      >
        다시 시도
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="do:rounded-3xl do:border do:border-dashed do:border-orange-200 do:bg-white/80 do:p-6 do:text-sm do:leading-6 do:text-slate-600">
      현재 회사 컨텍스트에서 표시할 에이전트가 없습니다.
    </div>
  );
}

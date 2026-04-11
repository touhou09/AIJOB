import { useEffect } from 'react';
import { usePluginAction, usePluginData, usePluginStream } from '@paperclipai/plugin-sdk/ui';
import type { PluginHostContext } from '@paperclipai/plugin-sdk/ui';
import type { AgentRosterState } from '../shared/types';
import { AgentCard } from './AgentCard';
import { useOfficeStore } from './store';

type OfficePageViewProps = {
  context: PluginHostContext;
  mode: 'page' | 'sidebar';
};

function getStreamChannel(companyId: string | null) {
  return companyId ? `agents:${companyId}` : 'agents:unknown';
}

export function OfficePageView({ context, mode }: OfficePageViewProps) {
  const companyId = context.companyId;
  const dataQuery = usePluginData<AgentRosterState>('agent-roster', { companyId });
  const refreshRoster = usePluginAction('refresh-agent-roster');
  const stream = usePluginStream<AgentRosterState>(getStreamChannel(companyId), { companyId: companyId ?? undefined });

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
    setLoading(dataQuery.loading && stream.lastEvent === null);
  }, [dataQuery.loading, setLoading, stream.lastEvent]);

  useEffect(() => {
    if (dataQuery.error) {
      setError(dataQuery.error.message);
      return;
    }

    if (dataQuery.data?.error) {
      setError(dataQuery.data.error);
      return;
    }

    if (dataQuery.data && !dataQuery.data.error) {
      replaceRoster(dataQuery.data);
    }
  }, [dataQuery.data, dataQuery.error, replaceRoster, setError]);

  useEffect(() => {
    if (stream.lastEvent?.error) {
      setError(stream.lastEvent.error);
      return;
    }

    if (stream.lastEvent) {
      replaceRoster(stream.lastEvent);
    }
  }, [replaceRoster, setError, stream.lastEvent]);

  const title = mode === 'page' ? 'Doro Office' : 'Doro Office sidebar';
  const description =
    mode === 'page'
      ? 'Paperclip 에이전트 상태를 10초 폴링과 실시간 stream으로 동기화하는 카드 그리드입니다.'
      : '현재 회사 컨텍스트의 에이전트 상태를 빠르게 확인하는 요약 카드입니다.';

  const visibleAgents = mode === 'page' ? agents : agents.slice(0, 4);
  const effectiveCompanyId = storeCompanyId ?? companyId;
  const isEmpty = !loading && !error && visibleAgents.length === 0;

  return (
    <section className="do:flex do:h-full do:flex-col do:gap-4 do:rounded-3xl do:border do:border-orange-200 do:bg-orange-50/40 do:p-4 do:text-slate-900 md:do:p-6">
      <header className="do:flex do:flex-col do:gap-4 do:rounded-3xl do:bg-white do:p-5 do:shadow-sm">
        <div className="do:flex do:flex-wrap do:items-start do:justify-between do:gap-4">
          <div className="do:min-w-0 do:flex-1">
            <div className="do:flex do:items-center do:gap-3">
              <div
                aria-hidden="true"
                className="do:flex do:size-12 do:items-center do:justify-center do:rounded-full do:bg-orange-100 do:text-xl"
              >
                🏢
              </div>
              <div className="do:min-w-0">
                <h1 className="do:text-lg do:font-semibold do:text-slate-950">{title}</h1>
                <p className="do:text-sm do:leading-6 do:text-slate-600">{description}</p>
              </div>
            </div>
          </div>

          <button
            className="do:inline-flex do:items-center do:justify-center do:rounded-full do:bg-orange-500 do:px-4 do:py-2 do:text-sm do:font-semibold do:text-white do:transition hover:do:bg-orange-600 focus-visible:do:outline-2 focus-visible:do:outline-offset-2 focus-visible:do:outline-orange-500 disabled:do:cursor-not-allowed disabled:do:bg-orange-300"
            disabled={!companyId}
            onClick={() => {
              if (!companyId) {
                return;
              }

              void refreshRoster({ companyId }).catch((refreshError) => {
                const message = refreshError instanceof Error ? refreshError.message : 'Failed to refresh roster';
                setError(message);
              });
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

      {loading ? (
        <LoadingState mode={mode} />
      ) : null}

      {error ? <ErrorState message={error} onRetry={dataQuery.refresh} /> : null}

      {isEmpty ? <EmptyState /> : null}

      {!loading && !error && visibleAgents.length > 0 ? (
        <div className={mode === 'page' ? 'do:grid do:gap-4 md:do:grid-cols-2 xl:do:grid-cols-3' : 'do:grid do:gap-3'}>
          {visibleAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : null}

      {mode === 'sidebar' && agents.length > visibleAgents.length ? (
        <p className="do:text-sm do:text-slate-500">외 {agents.length - visibleAgents.length}명의 에이전트가 페이지 뷰에 표시됩니다.</p>
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

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="do:rounded-3xl do:border do:border-rose-200 do:bg-rose-50 do:p-5 do:text-rose-950">
      <p className="do:text-sm do:font-semibold">에이전트 로스터를 불러오지 못했습니다.</p>
      <p className="do:mt-2 do:text-sm do:leading-6">{message}</p>
      <button
        className="do:mt-4 do:inline-flex do:rounded-full do:border do:border-rose-300 do:px-4 do:py-2 do:text-sm do:font-semibold do:text-rose-900"
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
    <div className="do:rounded-3xl do:border do:border-dashed do:border-orange-300 do:bg-white do:p-6 do:text-sm do:text-slate-600">
      표시할 에이전트가 없습니다. 회사 컨텍스트 또는 worker 권한을 확인하세요.
    </div>
  );
}

type LoadingStateProps = {
  mode: 'page' | 'sidebar';
};

function LoadingState({ mode }: LoadingStateProps) {
  const count = mode === 'page' ? 6 : 2;

  return (
    <div className={mode === 'page' ? 'do:grid do:gap-4 md:do:grid-cols-2 xl:do:grid-cols-3' : 'do:grid do:gap-3'}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} aria-hidden="true" className="do:animate-pulse do:rounded-3xl do:border do:border-orange-100 do:bg-white do:p-5">
          <div className="do:flex do:items-center do:gap-3">
            <div className="do:size-12 do:rounded-full do:bg-orange-100" />
            <div className="do:flex-1 do:space-y-2">
              <div className="do:h-4 do:w-32 do:rounded-full do:bg-orange-100" />
              <div className="do:h-3 do:w-20 do:rounded-full do:bg-slate-100" />
            </div>
          </div>
          <div className="do:mt-4 do:grid do:grid-cols-2 do:gap-3">
            <div className="do:h-16 do:rounded-2xl do:bg-slate-50" />
            <div className="do:h-16 do:rounded-2xl do:bg-slate-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
